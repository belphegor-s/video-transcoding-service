import { Request, Response } from "express";
import Video from "../models/Video";
import { z } from "zod";

export const userVideosController = async (req: Request, res: Response) => {
	try {
		// @ts-ignore
		const videos = await Video.findAll({ where: { user_id: req?.userId } });

		return res.json({ data: videos });
	} catch (e: any) {
		console.error("Error occurred in userVideosController() -> ", e);

		return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
	}
};

const userVideoSchema = z.object({
	key: z.string().max(1000),
});

export const userVideoController = async (req: Request, res: Response) => {
	try {
		const { key } = userVideoSchema.parse(req.query);
		const video = await Video.findOne({ where: { s3_key: key } });

		return res.json({ data: video });
	} catch (e: any) {
		if (e instanceof z.ZodError) {
			const errorMessage = e.errors.map((err) => err.message).join("; ");
			return res.status(400).json({ error: { message: errorMessage } });
		}

		console.error("Error occurred in userVideoController() -> ", e);

		return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
	}
};
