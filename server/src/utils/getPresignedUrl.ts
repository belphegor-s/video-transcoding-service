import { createPresignedPost, type PresignedPostOptions } from "@aws-sdk/s3-presigned-post";
import s3 from "../lib/s3";

export const getPresignedUrl = async (key: string, fileType: string, userId: string, maxBytes: number = 1024 * 1024 * 1024) => {
  const params: PresignedPostOptions = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: key,
    Conditions: [
      ["content-length-range", 0, maxBytes],
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
