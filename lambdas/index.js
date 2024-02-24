const AWS = require("aws-sdk");
const { createClient } = require("redis");
const { Client } = require("pg");

const ECS = new AWS.ECS();

const dbClient = new Client({
	connectionString: process.env.DATABASE_URI,
});

const client = createClient({
	password: process.env.REDIS_PASSWORD,
	socket: {
		host: process.env.REDIS_HOST,
		port: 11247,
	},
});

const pushToQueue = async (userId, objectKey) => {
	await client.hSet(userId, objectKey, Date.now());
};

const getQueueSize = async (userId) => {
	const objectKeys = await client.hKeys(userId);
	return objectKeys.length;
};

exports.handler = async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false; // Ensures the Lambda function doesn't wait for the event loop to be empty before returning

	try {
		const s3Event = event.Records[0].s3;
		// const bucketName = s3Event.bucket.name;
		const objectKey = s3Event.object.key;
		const userId = objectKey.split("/")[1];
		await client.connect();
		const queueSize = await getQueueSize(userId);

		// update video status
		await dbClient.connect();
		const query = {
			text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
			values: ["uploaded", objectKey],
		};

		await dbClient.query(query); // s3_key is a unique identifier

		if (queueSize >= 5) {
			return {
				statusCode: 400,
				body: `Queue limit reached for userId: ${userId}`,
			};
		}

		await pushToQueue(userId, objectKey);

		const runTaskParams = {
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
							{ name: "REDIS_HOST", value: process.env.REDIS_HOST },
							{ name: "REDIS_PASSWORD", value: process.env.REDIS_PASSWORD },
						],
					},
				],
			},
		};

		const taskRunResult = await ECS.runTask(runTaskParams).promise();
		console.log("ECS Task Started:", taskRunResult);

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
		await client.disconnect();
	}
};
