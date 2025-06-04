import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import ffmpeg from "fluent-ffmpeg";
import pkg from "pg";
const { Client: PGClient } = pkg;
import { createClient } from "redis";
import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

const dbClient = new PGClient({
  connectionString: process.env.DATABASE_URI,
});

const client = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: 17534,
  },
});

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

const downloadObjectFromS3 = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  const response = await s3.send(command);

  const localFilePath = `/tmp/${path.basename(key)}`;
  const fileStream = fs.createWriteStream(localFilePath);
  await streamPipeline(response.Body, fileStream);

  return localFilePath;
};

const transcodeVideo = async (localFilePath, outputKey, outputResolution) => {
  return new Promise((resolve, reject) => {
    console.info(`Transcoding ${localFilePath} for resolution: ${outputResolution}...`);
    const outputFile = `${outputResolution}.mp4`;

    ffmpeg()
      .input(localFilePath)
      .outputOptions("-preset veryfast")
      .outputOptions(`-vf scale=${outputResolution}`)
      .output(outputFile)
      .on("end", async () => {
        console.info(`Transcoding done for resolution: ${outputResolution}`);
        try {
          const upload = new Upload({
            client: s3,
            params: {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: outputKey,
              Body: fs.createReadStream(outputFile),
            },
          });
          const data = await upload.done();
          resolve(data);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject)
      .run();
  });
};

const getVideoResolution = (localFilePath, inputKey) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(localFilePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Error probing video ${inputKey}: ${err.message}`));
      } else {
        const { width, height } = metadata.streams.find((s) => s.codec_type === "video");
        if (width && height) resolve({ width, height });
        else reject(new Error(`Video resolution not found in metadata for ${inputKey}`));
      }
    });
  });
};

const transcodeAndUploadObject = async (inputKey) => {
  try {
    const localFilePath = await downloadObjectFromS3(inputKey);
    const resolutions = ["3840x2160", "2560x1440", "1920x1080", "1280x720", "854x480", "640x360"];
    const originalResolution = await getVideoResolution(localFilePath, inputKey);

    console.info("Original resolution:", originalResolution);

    const applicableResolutions = resolutions.filter((res) => {
      const [w, h] = res.split("x").map(Number);
      return w <= originalResolution.width && h <= originalResolution.height;
    });

    console.info("Applicable resolutions:", applicableResolutions);

    const transcodedUrls = [];
    const transcodePromises = applicableResolutions.map((res) => {
      const outputKey = `${process.env.USER_ID}/${path.basename(inputKey)}/${res}.mp4`;
      transcodedUrls.push(outputKey);
      return transcodeVideo(localFilePath, outputKey, res);
    });

    await Promise.all(transcodePromises);

    await dbClient.connect();
    await dbClient.query({
      text: 'UPDATE "Videos" SET status = $1, transcoded_urls = $2 WHERE s3_key = $3',
      values: ["transcoded", transcodedUrls, inputKey],
    });

    await client.connect();
    await client.hDel(process.env.USER_ID, inputKey);
  } catch (error) {
    await dbClient.connect();
    await dbClient.query({
      text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
      values: ["error", inputKey],
    });
    console.error(`Error transcoding ${inputKey}:`, error.message);
    throw error;
  } finally {
    await dbClient.end();
    await client.disconnect();
    process.exit(0);
  }
};

(async () => {
  try {
    const videoKey = process.env.VIDEO_KEY;
    await transcodeAndUploadObject(videoKey);
  } catch (err) {
    console.error("An error occurred:", err.message);
    process.exit(1);
  }
})();
