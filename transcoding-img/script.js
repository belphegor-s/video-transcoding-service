import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import ffmpeg from "fluent-ffmpeg";
import pkg from "pg";
import { createClient } from "redis";
import fs from "fs-extra";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

const dbClient = new pkg.Client({
  connectionString: process.env.DATABASE_URI,
});

const redisClient = createClient({
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

const transcodeToHLS = async (localFilePath, outputKeyPrefix, outputResolution) => {
  return new Promise((resolve, reject) => {
    console.info(`Transcoding to HLS ${localFilePath} for resolution: ${outputResolution}...`);

    const outputDir = `/tmp/hls_${outputResolution}`;
    fs.ensureDirSync(outputDir);

    ffmpeg(localFilePath)
      .outputOptions([
        "-preset veryfast",
        `-vf scale=${outputResolution}`,
        "-profile:v baseline", // compatibility
        "-level 3.0",
        "-start_number 0",
        "-hls_time 10",
        "-hls_list_size 0",
        "-f hls",
      ])
      .output(path.join(outputDir, "index.m3u8"))
      .on("end", async () => {
        console.info(`HLS transcoding done for resolution: ${outputResolution}`);

        try {
          // Upload all files inside outputDir to S3 under outputKeyPrefix
          const files = await fs.readdir(outputDir);

          const uploadPromises = files.map((file) => {
            const filePath = path.join(outputDir, file);
            const s3Key = `${outputKeyPrefix}/${file}`;
            return new Upload({
              client: s3,
              params: {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key,
                Body: fs.createReadStream(filePath),
              },
            }).done();
          });

          await Promise.all(uploadPromises);

          // Cleanup temp folder
          await fs.remove(outputDir);

          resolve(`${outputKeyPrefix}/index.m3u8`); // return playlist key
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
        const videoStream = metadata.streams.find((s) => s.codec_type === "video");
        if (videoStream && videoStream.width && videoStream.height) {
          resolve({ width: videoStream.width, height: videoStream.height });
        } else {
          reject(new Error(`Video resolution not found in metadata for ${inputKey}`));
        }
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

    // Filter only resolutions smaller or equal to original
    const applicableResolutions = resolutions.filter((res) => {
      const [w, h] = res.split("x").map(Number);
      return w <= originalResolution.width && h <= originalResolution.height;
    });

    console.info("Applicable resolutions:", applicableResolutions);

    await dbClient.connect();
    await redisClient.connect();

    const hlsPlaylistUrls = [];
    for (const res of applicableResolutions) {
      const outputKeyPrefix = `${process.env.USER_ID}/${path.basename(inputKey)}/${res}_hls`;
      const playlistKey = await transcodeToHLS(localFilePath, outputKeyPrefix, res);
      hlsPlaylistUrls.push(playlistKey);
    }

    // Save playlist URLs to DB
    await dbClient.query({
      text: 'UPDATE "Videos" SET status = $1, transcoded_urls = $2 WHERE s3_key = $3',
      values: ["transcoded", hlsPlaylistUrls, inputKey],
    });

    // Clean Redis flag
    await redisClient.hDel(process.env.USER_ID, inputKey);

    console.info("Transcoding and upload complete.");
  } catch (error) {
    try {
      await dbClient.connect();
      await dbClient.query({
        text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
        values: ["error", inputKey],
      });
    } catch (_) {
      // swallow db error on failure path
    }
    console.error(`Error transcoding ${inputKey}:`, error.message);
    throw error;
  } finally {
    await dbClient.end();
    await redisClient.disconnect();
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
