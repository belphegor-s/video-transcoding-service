const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { createClient } = require("redis");
const { Client } = require("pg");

const ecsClient = new ECSClient({ region: process.env.AWS_REGION });

const QUEUE_LIMIT = 5;
const REDIS_PORT = Number(process.env.REDIS_PORT) || 17534;

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const s3Event = event.Records[0].s3;
  // S3 URL-encodes the key in the event payload ("+" for spaces).
  const objectKey = decodeURIComponent(s3Event.object.key.replace(/\+/g, " "));
  const userId = objectKey.split("/")[1];

  const dbClient = new Client({ connectionString: process.env.DATABASE_URI });

  const setStatus = async (status) => {
    await dbClient.query({
      text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
      values: [status, objectKey],
    });
  };

  // Redis only backs the per-user concurrency queue. It must never be able to
  // strand a video in `signed_url_generated`, so every call is best-effort.
  let redisClient = null;
  const withRedis = async (fn, fallback) => {
    try {
      if (!redisClient) {
        redisClient = createClient({
          username: process.env.REDIS_USERNAME,
          password: process.env.REDIS_PASSWORD,
          socket: { host: process.env.REDIS_HOST, port: REDIS_PORT, connectTimeout: 5000 },
        });
        redisClient.on("error", () => {});
        await redisClient.connect();
      }
      return await fn(redisClient);
    } catch (err) {
      console.error("Redis unavailable, continuing without queue accounting:", err.message);
      return fallback;
    }
  };

  try {
    await dbClient.connect();

    // Mark the upload before anything else can fail: the object is already in S3.
    await setStatus("uploaded");

    const queueSize = await withRedis(async (c) => (await c.hKeys(userId)).length, 0);
    if (queueSize >= QUEUE_LIMIT) {
      return { statusCode: 400, body: `Queue limit reached for userId: ${userId}` };
    }

    await withRedis((c) => c.hSet(userId, objectKey, Date.now()), null);

    const runTaskCommand = new RunTaskCommand({
      cluster: "video-transcoder",
      taskDefinition: "video-transcoder-task",
      launchType: "FARGATE",
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          subnets: [process.env.SUBNET_1, process.env.SUBNET_2, process.env.SUBNET_3],
          securityGroups: [process.env.SECURITY_GROUP],
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: "video-transcoder-image",
            environment: [
              { name: "VIDEO_KEY", value: objectKey },
              { name: "USER_ID", value: userId },
              { name: "S3_REGION", value: process.env.S3_REGION },
              { name: "S3_BUCKET_NAME", value: process.env.S3_BUCKET_NAME },
              { name: "ACCESS_KEY_ID", value: process.env.ACCESS_KEY_ID },
              { name: "SECRET_ACCESS_KEY", value: process.env.SECRET_ACCESS_KEY },
              { name: "DATABASE_URI", value: process.env.DATABASE_URI },
              { name: "REDIS_USERNAME", value: process.env.REDIS_USERNAME },
              { name: "REDIS_PASSWORD", value: process.env.REDIS_PASSWORD },
              { name: "REDIS_HOST", value: process.env.REDIS_HOST },
              { name: "DEEPGRAM_API_KEY", value: process.env.DEEPGRAM_API_KEY },
            ],
          },
        ],
      },
    });

    const taskRunResult = await ecsClient.send(runTaskCommand);
    console.log("ECS Task Started:", taskRunResult);

    await setStatus("transcoding");

    return { statusCode: 200, body: "Video added to processing queue" };
  } catch (err) {
    console.error(err);
    // Surface the failure instead of leaving the row stuck mid-pipeline.
    try {
      await setStatus("error");
    } catch (statusErr) {
      console.error("Could not mark video as errored:", statusErr.message);
    }
    return { statusCode: 500, body: "An error occurred" };
  } finally {
    await dbClient.end().catch(() => {});
    if (redisClient) await redisClient.disconnect().catch(() => {});
  }
};
