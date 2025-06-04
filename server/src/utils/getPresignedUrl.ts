import "dotenv/config";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost, type PresignedPostOptions } from "@aws-sdk/s3-presigned-post";

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const getPresignedUrl = async (key: string, fileType: string, userId: string) => {
  const params: PresignedPostOptions = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Conditions: [
      ["content-length-range", 0, 1024 * 1024 * 1024 * 5], // Max 5GB
      { "Content-Type": fileType },
      { "x-amz-meta-userId": userId },
    ],
    Fields: {
      "Content-Type": fileType,
      "x-amz-meta-userId": userId,
    },
    Expires: 60 * 60, // 1 hour
  };

  try {
    const result = await createPresignedPost(s3, params);
    return result;
  } catch (err) {
    throw err;
  }
};
