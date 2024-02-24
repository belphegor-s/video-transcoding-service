const AWS = require("aws-sdk");
const ffmpeg = require("fluent-ffmpeg");
const { Client } = require("pg");
const { createClient } = require("redis");
const fs = require("fs");

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

// Configure AWS SDK
AWS.config.update({
	accessKeyId: process.env.ACCESS_KEY_ID,
	secretAccessKey: process.env.SECRET_ACCESS_KEY,
	region: process.env.S3_REGION,
});

const s3 = new AWS.S3();

const downloadObjectFromS3 = (key) => {
	const params = {
		Bucket: process.env.S3_BUCKET_NAME,
		Key: key,
	};

	const localFilePath = `/tmp/${key.split("/")[2]}`;
	const fileStream = fs.createWriteStream(localFilePath);

	return new Promise((resolve, reject) => {
		s3.getObject(params)
			.createReadStream()
			.pipe(fileStream)
			.on("error", reject)
			.on("close", () => resolve(localFilePath));
	});
};

// Function to transcode video
const transcodeVideo = async (localFilePath, outputKey, outputResolution) => {
	return new Promise((resolve, reject) => {
		console.info(`Transcoding ${localFilePath} for resolution: ${outputResolution}...`);
		ffmpeg()
			.input(localFilePath)
			.outputOptions("-preset veryfast")
			.outputOptions(`-vf scale=${outputResolution}`)
			.output(`${outputResolution}.mp4`)
			.on("end", () => {
				console.info(`Transcoding Done ${localFilePath} for resolution: ${outputResolution}!`);
				const params = {
					Bucket: process.env.S3_BUCKET_NAME,
					Key: outputKey,
					Body: fs.createReadStream(`${outputResolution}.mp4`),
				};
				s3.upload(params, (err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				});
			})
			.on("error", (err) => {
				reject(err);
			})
			.run();
	});
};

// Function to get video resolution
const getVideoResolution = async (localFilePath, inputKey) => {
	try {
		return new Promise((resolve, reject) => {
			ffmpeg.ffprobe(localFilePath, (err, metadata) => {
				if (err) {
					reject(new Error(`Error probing video ${inputKey}: ${err.message}`));
				} else {
					const { width, height } = metadata.streams.find((stream) => stream.codec_type === "video");
					if (width && height) {
						resolve({ width, height });
					} else {
						reject(new Error(`Video resolution not found in metadata for ${inputKey}`));
					}
				}
			});
		});
	} catch (error) {
		throw new Error(`Error getting video resolution for ${inputKey}: ${error.message}`);
	}
};

// Function to handle transcoding and uploading
const transcodeAndUploadObject = async (inputKey) => {
	try {
		const localFilePath = await downloadObjectFromS3(inputKey);

		// Define resolutions available for transcoding
		const resolutions = ["3840x2160", "2560x1440", "1920x1080", "1280x720", "854x480", "640x360"];

		// Get the original video's resolution
		const originalResolution = await getVideoResolution(localFilePath, inputKey);

		console.info("Original resolution: ", originalResolution);

		// Filter resolutions based on the original resolution
		const applicableResolutions = resolutions.filter((resolution) => {
			const [width, height] = resolution.split("x").map(Number);
			return width <= originalResolution.width && height <= originalResolution.height;
		});

		console.info("Applicable resolutions: ", applicableResolutions);

		const transcodedUrls = [];

		// Transcode video to different resolutions
		const transcodePromises = applicableResolutions.map((resolution) => {
			const outputKey = `${process.env.USER_ID}/${inputKey.split("/")[2]}/${resolution}.mp4`;
			transcodedUrls.push(outputKey);
			return transcodeVideo(localFilePath, outputKey, resolution);
		});

		await Promise.all(transcodePromises);
		console.log(`Transcoding completed for ${inputKey}`);
		console.log("Transcoded URLs: ", transcodedUrls);

		// update status in db for the video
		await dbClient.connect();
		const query = {
			text: 'UPDATE "Videos" SET status = $1, transcoded_urls = $2 WHERE s3_key = $3',
			values: ["transcoded", transcodedUrls, inputKey],
		};

		await dbClient.query(query); // s3_key is a unique identifier

		// clear the queue
		await client.connect();
		await client.hDel(process.env.USER_ID, inputKey);
	} catch (error) {
		// update status in db for the video
		await dbClient.connect();
		const query = {
			text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
			values: ["error", inputKey],
		};
		await dbClient.query(query); // s3_key is a unique identifier
		console.error(`Error transcoding ${inputKey}: ${error.message}`);
		throw error; // Rethrow error for proper error handling at the entry point
	} finally {
		await dbClient.end();
		await client.disconnect();
		process.exit(0); // close the process once done
	}
};

// Entry point
(async () => {
	try {
		const videoKey = process.env.VIDEO_KEY;
		await transcodeAndUploadObject(videoKey);
	} catch (error) {
		console.error("An error occurred:", error.message);
		process.exit(1); // Exit with non-zero code to indicate failure
	}
})();
