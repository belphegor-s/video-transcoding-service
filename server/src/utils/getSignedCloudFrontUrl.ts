import { getSignedUrl } from "aws-cloudfront-sign";
import fs from "fs";
import path from "path";

const privateKey = fs.readFileSync(path.resolve(__dirname, "../../keys/private_key.pem"), "utf8");
const keyPairId = process.env.CLOUDFRONT_PUBLIC_KEY_ID!;

export const getSignedCloudFrontUrl = (resourcePath: string, expiresInHours = 12) => {
  const expireTime = Math.floor(Date.now()) + expiresInHours * 60 * 60 * 1000;

  const signedUrl = getSignedUrl(`${process.env.CLOUDFRONT_URL!}/${resourcePath}`, {
    keypairId: keyPairId,
    privateKeyString: privateKey,
    expireTime,
  });

  return signedUrl;
};
