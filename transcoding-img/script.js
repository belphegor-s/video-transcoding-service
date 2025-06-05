import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import ffmpeg from "fluent-ffmpeg";
import pkg from "pg";
import { createClient } from "redis";
import fs from "fs-extra";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { webvtt, srt } from "@deepgram/captions";
import os from "os";

const streamPipeline = promisify(pipeline);
const numCPUs = os.cpus().length;

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

const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY);

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

const extractAudioForTranscription = async (localFilePath) => {
  return new Promise((resolve, reject) => {
    const audioPath = `/tmp/audio_${Date.now()}.wav`;

    ffmpeg(localFilePath)
      .output(audioPath)
      .audioCodec("pcm_s16le")
      .audioChannels(1)
      .audioFrequency(16000)
      .noVideo()
      .on("end", () => resolve(audioPath))
      .on("error", reject)
      .run();
  });
};

const detectLanguage = async (audioPath) => {
  try {
    const audioBuffer = await fs.readFile(audioPath);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      model: "nova-2",
      detect_language: true,
      punctuate: true,
      smart_format: true,
      paragraphs: false,
      utterances: false,
      diarize: false,
    });

    const detectedLanguage = result.results?.channels?.[0]?.detected_language || "en";
    console.info(`Detected language: ${detectedLanguage}`);

    return detectedLanguage;
  } catch (error) {
    console.warn("Language detection failed, defaulting to English:", error.message);
    return "en";
  }
};

const generateCaptions = async (audioPath, language = "en") => {
  try {
    const audioBuffer = await fs.readFile(audioPath);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
      model: "nova-2",
      language: language,
      punctuate: true,
      smart_format: true,
      paragraphs: false,
      utterances: true,
      diarize: false,
      timestamps: true,
    });

    return result;
  } catch (error) {
    console.error(`Error generating captions for language ${language}:`, error.message);
    throw error;
  }
};

const convertToWebVTT = (transcriptionResult) => {
  try {
    return webvtt(transcriptionResult);
  } catch (error) {
    console.error("Error converting to WebVTT:", error.message);
    throw error;
  }
};

const convertToSRT = (transcriptionResult) => {
  try {
    return srt(transcriptionResult);
  } catch (error) {
    console.error("Error converting to SRT:", error.message);
    throw error;
  }
};

const uploadCaptionsToS3 = async (captionContent, key, format) => {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: captionContent,
      ContentType: format === "vtt" ? "text/vtt" : "text/srt",
    },
  });

  await upload.done();
  return key;
};

const processCaptions = async (localFilePath, baseOutputKeyPrefix) => {
  try {
    console.info("Extracting audio for transcription...");
    const audioPath = await extractAudioForTranscription(localFilePath);

    console.info("Detecting language...");
    const detectedLanguage = await detectLanguage(audioPath);

    const captionUrls = {};
    const languagesToProcess = ["en"]; // Always include English

    // Add detected language if it's not English
    if (detectedLanguage !== "en") {
      languagesToProcess.push(detectedLanguage);
    }

    // Process captions for each language
    for (const lang of languagesToProcess) {
      console.info(`Generating captions for language: ${lang}`);

      try {
        const transcriptionResult = await generateCaptions(audioPath, lang);

        // Convert to WebVTT and SRT
        const vttContent = convertToWebVTT(transcriptionResult);
        const srtContent = convertToSRT(transcriptionResult);

        // Upload captions to S3
        const vttKey = `${baseOutputKeyPrefix}/captions/${lang}.vtt`;
        const srtKey = `${baseOutputKeyPrefix}/captions/${lang}.srt`;

        await Promise.all([uploadCaptionsToS3(vttContent, vttKey, "vtt"), uploadCaptionsToS3(srtContent, srtKey, "srt")]);

        captionUrls[lang] = {
          vtt: vttKey,
          srt: srtKey,
        };

        console.info(`Captions uploaded for language ${lang}`);
      } catch (error) {
        console.error(`Failed to process captions for language ${lang}:`, error.message);
      }
    }

    // Clean up audio file
    await fs.remove(audioPath);

    return captionUrls;
  } catch (error) {
    console.error("Error processing captions:", error.message);
    return {};
  }
};

const transcodeToHLS = async (localFilePath, outputKeyPrefix, outputResolution) => {
  return new Promise((resolve, reject) => {
    console.info(`Transcoding to HLS ${localFilePath} for resolution: ${outputResolution}...`);

    const outputDir = `/tmp/hls_${outputResolution}_${Date.now()}`;
    fs.ensureDirSync(outputDir);

    // Optimize ffmpeg settings for faster transcoding
    const ffmpegCommand = ffmpeg(localFilePath)
      .outputOptions([
        "-preset ultrafast", // Fastest preset for ECS Fargate
        `-vf scale=${outputResolution}`,
        "-profile:v baseline",
        "-level 3.0",
        "-start_number 0",
        "-hls_time 6", // Shorter segments for faster processing
        "-hls_list_size 0",
        "-f hls",
        "-threads 0", // Use all available threads
        "-tune zerolatency", // Optimize for speed
        "-movflags +faststart",
      ])
      .output(path.join(outputDir, "index.m3u8"));

    ffmpegCommand
      .on("progress", (progress) => {
        console.info(`${outputResolution}: ${Math.round(progress.percent || 0)}% complete`);
      })
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

const generateMasterPlaylist = async (playlistKeys, outputKeyPrefix, captionUrls) => {
  const masterContent = playlistKeys
    .map((key) => {
      const resolution = key.match(/(\d+)x(\d+)_hls/);
      if (!resolution) return "";
      const [_, width, height] = resolution;
      const bandwidth = width * height * 0.07;

      const variantPath = `${path.basename(path.dirname(key))}/index.m3u8`;

      return `#EXT-X-STREAM-INF:BANDWIDTH=${Math.floor(bandwidth)},RESOLUTION=${width}x${height}\n${variantPath}`;
    })
    .join("\n");

  // Add subtitle tracks to master playlist
  let subtitleTracks = "";
  for (const [lang, urls] of Object.entries(captionUrls)) {
    const langName = lang === "en" ? "English" : lang.toUpperCase();
    subtitleTracks += `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="${langName}",DEFAULT=${lang === "en" ? "YES" : "NO"},AUTOSELECT=${
      lang === "en" ? "YES" : "NO"
    },FORCED=NO,LANGUAGE="${lang}",URI="captions/${lang}.vtt"\n`;
  }

  const finalContent = `#EXTM3U\n#EXT-X-VERSION:3\n${subtitleTracks}${masterContent}`;
  const masterPath = `/tmp/master_${Date.now()}.m3u8`;

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

  await fs.remove(masterPath);
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

    const baseOutputKeyPrefix = `${process.env.USER_ID}/${path.basename(inputKey, path.extname(inputKey))}`;

    // Process captions in parallel with transcoding preparation
    const captionPromise = processCaptions(localFilePath, baseOutputKeyPrefix);

    // Parallel transcoding with worker threads (limit concurrent workers to avoid memory issues)
    const maxConcurrentWorkers = Math.min(numCPUs, applicableResolutions.length, 4);
    const hlsPlaylistUrls = [];

    for (let i = 0; i < applicableResolutions.length; i += maxConcurrentWorkers) {
      const batch = applicableResolutions.slice(i, i + maxConcurrentWorkers);
      const batchPromises = batch.map(async (res) => {
        const outputKeyPrefix = `${baseOutputKeyPrefix}/${res}_hls`;
        return await transcodeToHLS(localFilePath, outputKeyPrefix, res);
      });

      const batchResults = await Promise.all(batchPromises);
      hlsPlaylistUrls.push(...batchResults);
    }

    // Wait for captions to complete
    const captionUrls = await captionPromise;

    // Generate master playlist with captions
    const masterPlaylistKey = await generateMasterPlaylist(hlsPlaylistUrls, baseOutputKeyPrefix, captionUrls);

    // Update database with results
    await dbClient.query({
      text: 'UPDATE "Videos" SET status = $1, transcoded_urls = $2, master_playlist_url = $3, caption_urls = $4 WHERE s3_key = $5',
      values: ["transcoded", hlsPlaylistUrls, masterPlaylistKey, JSON.stringify(captionUrls), inputKey],
    });

    await redisClient.hDel(process.env.USER_ID, inputKey);

    // Clean up local file
    await fs.remove(localFilePath);

    console.info("Transcoding, caption generation, and upload complete.");
  } catch (error) {
    try {
      await dbClient.connect();
      await dbClient.query({
        text: 'UPDATE "Videos" SET status = $1 WHERE s3_key = $2',
        values: ["error", inputKey],
      });
    } catch (_) {}

    console.error(`Error processing ${inputKey}:`, error.message);
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
