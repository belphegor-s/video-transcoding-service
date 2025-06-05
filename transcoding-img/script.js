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
      .outputOptions(["-preset veryfast", `-vf scale=${outputResolution}`, "-profile:v baseline", "-level 3.0", "-start_number 0", "-hls_time 10", "-hls_list_size 0", "-f hls"])
      .output(path.join(outputDir, "index.m3u8"))
      .on("end", async () => {
        console.info(`HLS transcoding done for resolution: ${outputResolution}`);

        try {
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
          await fs.remove(outputDir);

          resolve(`${outputKeyPrefix}/index.m3u8`);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject)
      .run();
  });
};

const generateMasterPlaylist = async (playlistKeys, outputKeyPrefix) => {
  const masterContent = playlistKeys
    .map((key) => {
      const resolution = key.match(/(\d+)x(\d+)_hls/);
      if (!resolution) return "";
      const [_, width, height] = resolution;
      const bandwidth = width * height * 0.07;

      const variantPath = `${path.basename(path.dirname(key))}/index.m3u8`;

      return `#EXT-X-STREAM-INF:BANDWIDTH=${Math.floor(bandwidth)},RESOLUTION=${width}x${height}
${variantPath}
`;
    })
    .join("");

  const finalContent = `#EXTM3U\n${masterContent}`;
  const masterPath = `/tmp/master.m3u8`;

  await fs.writeFile(masterPath, finalContent);

  const masterKey = `${outputKeyPrefix}/master.m3u8`;

  await new Upload({
    client: s3,
    params: {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: masterKey,
      Body: fs.createReadStream(masterPath),
    },
  }).done();

  return masterKey;
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

    const applicableResolutions = resolutions.filter((res) => {
      const [w, h] = res.split("x").map(Number);
      return w <= originalResolution.width && h <= originalResolution.height;
    });

    console.info("Applicable resolutions:", applicableResolutions);

    await dbClient.connect();
    await redisClient.connect();

    const hlsPlaylistUrls = [];
    const baseOutputKeyPrefix = `${process.env.USER_ID}/${path.basename(inputKey)}`;

    for (const res of applicableResolutions) {
      const outputKeyPrefix = `${baseOutputKeyPrefix}/${res}_hls`;
      const playlistKey = await transcodeToHLS(localFilePath, outputKeyPrefix, res);
      hlsPlaylistUrls.push(playlistKey);
    }

    const masterPlaylistKey = await generateMasterPlaylist(hlsPlaylistUrls, baseOutputKeyPrefix);

    await dbClient.query({
      text: 'UPDATE "Videos" SET status = $1, transcoded_urls = $2, master_playlist_url = $3 WHERE s3_key = $4',
      values: ["transcoded", hlsPlaylistUrls, masterPlaylistKey, inputKey],
    });

    await redisClient.hDel(process.env.USER_ID, inputKey);

    console.info("Transcoding and upload complete.");
  } catch (error) {
    try {
      await dbClient.connect();
      await dbClient.query({
        text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
        values: ["error", inputKey],
      });
    } catch (_) {}

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
