const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { createClient } = require("redis");
const { Client } = require("pg");

const ecsClient = new ECSClient({ region: process.env.AWS_REGION });

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const redisClient = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: 17534,
    },
  });

  const dbClient = new Client({
    connectionString: process.env.DATABASE_URI,
  });

  const pushToQueue = async (userId, objectKey) => {
    await redisClient.hSet(userId, objectKey, Date.now());
  };

  const getQueueSize = async (userId) => {
    const objectKeys = await redisClient.hKeys(userId);
    return objectKeys.length;
  };

  try {
    await redisClient.connect();
    await dbClient.connect();

    const s3Event = event.Records[0].s3;
    const objectKey = s3Event.object.key;
    const userId = objectKey.split("/")[1];

    const queueSize = await getQueueSize(userId);

    const query = {
      text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
      values: ["uploaded", objectKey],
    };
    await dbClient.query(query);

    if (queueSize >= 5) {
      return {
        statusCode: 400,
        body: `Queue limit reached for userId: ${userId}`,
      };
    }

    await pushToQueue(userId, objectKey);

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

    await dbClient.query({
      text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
      values: ["transcoding", objectKey],
    });

    return {
      statusCode: 200,
      body: "Video added to processing queue",
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: "An error occurred",
    };
  } finally {
    await dbClient.end();
    await redisClient.disconnect();
  }
};
