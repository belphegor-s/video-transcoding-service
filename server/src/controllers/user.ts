import { Request, Response } from "express";
import { z } from "zod";
import User from "../models/User";
import { compare, hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import jwt, { Secret } from "jsonwebtoken";

const userSchema = z.object({
	name: z.string().min(2).max(255),
	email: z.string().email(),
	password: z
		.string()
		.min(8)
		.regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/),
});

export const createUserController = async (req: Request, res: Response) => {
	try {
		const { name, email, password } = userSchema.parse(req.body);

		const existingUser = await User.findOne({ where: { email } });
		if (existingUser) {
			return res.status(400).json({ error: { message: "Email already exists" } });
		}

		const hashedPassword = await hash(password, 12);

		const newUserId = uuid();
		await User.create({ user_id: newUserId, name, email, password: hashedPassword });

		res.status(201).json({ data: { message: "User created successfully" } });
	} catch (e: any) {
		if (e instanceof z.ZodError) {
			const errorMessage = e.errors.map((err) => err.message).join("; ");
			return res.status(400).json({ error: { message: errorMessage } });
		}

		console.error("Error occurred in createUserController() -> ", e);

		return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
	}
};

const loginCredentialsSchema = z.object({
	email: z.string().email(),
	password: z
		.string()
		.min(8)
		.regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/),
});

export const loginUserController = async (req: Request, res: Response) => {
	try {
		const { email, password } = loginCredentialsSchema.parse(req.body);

		const existingUser = await User.findOne({ where: { email } });
		if (!existingUser) {
			return res.status(400).json({ error: { message: "User with this email doesn't exists!" } });
		}

		const isPasswordValid = await compare(password, existingUser.password);

		if (isPasswordValid) {
			const accessToken = jwt.sign({ userId: existingUser.user_id, email }, process.env.JWT_ACCESS_TOKEN_SECRET as Secret, { expiresIn: "1h" });
			const refreshToken = jwt.sign({ userId: existingUser.user_id, email }, process.env.JWT_REFRESH_TOKEN_SECRET as Secret, { expiresIn: "7d" });

			res.json({ data: { accessToken, refreshToken } });
		} else {
			res.status(400).json({ error: { message: "Password is invalid!" } });
		}
	} catch (e: any) {
		if (e instanceof z.ZodError) {
			const errorMessage = e.errors.map((err) => err.message).join("; ");
			return res.status(400).json({ error: { message: errorMessage } });
		}

		console.error("Error occurred in loginUserController() -> ", e);

		return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
	}
};

const tokenRefreshSchema = z.object({
	refreshToken: z.string(),
});

export const tokenRefreshController = async (req: Request, res: Response) => {
	try {
		const { refreshToken: refreshTokenPayload } = tokenRefreshSchema.parse(req.body);

		const decodedToken = jwt.verify(refreshTokenPayload, process.env.JWT_REFRESH_TOKEN_SECRET as Secret);

		if (!decodedToken) {
			res.status(400).json({ error: { message: "Token invalid!" } });
		}

		// @ts-ignore
		const accessToken = jwt.sign({ userId: decodedToken.userId, email: decodedToken.email }, process.env.JWT_ACCESS_TOKEN_SECRET as Secret, { expiresIn: "1h" });

		// @ts-ignore
		const refreshToken = jwt.sign({ userId: decodedToken.userId, email: decodedToken.email }, process.env.JWT_REFRESH_TOKEN_SECRET as Secret, { expiresIn: "7d" });

		res.json({ data: { accessToken, refreshToken } });
	} catch (e: any) {
		if (e instanceof z.ZodError) {
			const errorMessage = e.errors.map((err) => err.message).join("; ");
			return res.status(400).json({ error: { message: errorMessage } });
		}

		console.error("Error occurred in tokenRefreshController() -> ", e);

		return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
	}
};

export const meController = async (req: Request, res: Response) => {
	// @ts-ignore
	res.json({ data: { userId: req?.userId, email: req?.email } });
};
