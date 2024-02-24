import AWS from "../config/aws";

const s3 = new AWS.S3({
	region: process.env.S3_REGION,
});

export const getPresignedUrl = (key: string, fileType: string, userId: string) => {
	return new Promise((resolve, reject) => {
		const params = {
			Bucket: process.env.S3_BUCKET_NAME,
			Fields: {
				"Content-Type": fileType,
				Key: key,
				"x-amz-meta-userId": userId,
			},
			Expires: 3600,
			Conditions: [["content-length-range", 0, 1024 * 1024 * 1024 * 5]], // max 5GB file
		};

		s3.createPresignedPost(params, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
};
