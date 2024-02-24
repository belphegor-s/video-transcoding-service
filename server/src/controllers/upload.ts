import { Request, Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { getPresignedUrl } from "../utils/getPresignedUrl";
import Video from "../models/Video";

const uploadVideosSchema = z.object({
	fileType: z.string().refine(
		(value) => {
			const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-flv"];
			return allowedTypes.includes(value);
		},
		{ message: "Invalid file type. Only video files are allowed." }
	),
});

export const uploadVideosController = async (req: Request, res: Response) => {
	try {
		const { fileType } = uploadVideosSchema.parse(req.query);
		// @ts-ignore
		const id = `uploads/${req.userId}/video-${uuid()}`;
		// @ts-ignore
		const url = await getPresignedUrl(id, fileType, req.userId);

		// save video data to db
		await Video.create({
			video_id: uuid(),
			// @ts-ignore
			user_id: req.userId,
			s3_key: id,
			mime_type: fileType,
			status: "signed_url_generated",
		});

		return res.json({ data: url });
	} catch (e: any) {
		if (e instanceof z.ZodError) {
			const errorMessage = e.errors.map((err) => err.message).join("; ");
			return res.status(400).json({ error: { message: errorMessage } });
		}

		console.error("Error occurred in uploadVideosController() -> ", e);

		return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
	}
};
