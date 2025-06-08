import { Request, Response } from "express";
import { z } from "zod";
import User from "../models/User";
import { compare, hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import jwt, { Secret } from "jsonwebtoken";
import { passwordResetEmail, verifyEmailTemplate } from "../email_templates/email";
import { sendEmail } from "../lib/sendEmail";

const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // 1 hour
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days

const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(255, "Name can't exceed 255 characters"),
  email: z.string().email("Please provide a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/, "Password must include uppercase, lowercase, number, and special character"),
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

    const verifyToken = uuid();
    const verifyTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    await User.create({
      user_id: newUserId,
      name,
      email,
      password: hashedPassword,
      verify_token: verifyToken,
      verify_token_expiry: verifyTokenExpiry,
    });

    const verifyLink = `${process.env.CLIENT_APP_URL}/verify-email?token=${verifyToken}`;

    const { subject, html } = verifyEmailTemplate({
      verifyLink,
      appName: "Video Transcoder",
    });

    await sendEmail({ to: email, subject, html });

    res.status(201).json({ data: { message: "User created. Verification email sent." } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error occurred in createUserController() -> ", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

export const verifyEmailController = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ error: { message: "Verification token is required" } });
    }

    const user = await User.findOne({ where: { verify_token: token } });

    if (!user) {
      return res.status(400).json({ error: { message: "Invalid verification token" } });
    }

    if (!user.verify_token_expiry || user.verify_token_expiry.getTime() < Date.now()) {
      return res.status(400).json({ error: { message: "Verification token expired" } });
    }

    await user.update({
      verify_token: null,
      verify_token_expiry: null,
      is_verified: true,
    });

    res.json({ data: { message: "Email verified successfully" } });
  } catch (e: any) {
    console.error("Error in verifyEmailController ->", e);
    res.status(500).json({ error: { message: e?.message || "Internal error" } });
  }
};

const loginCredentialsSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/, "Password must include uppercase, lowercase, number, and special character"),
});

export const loginUserController = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginCredentialsSchema.parse(req.body);

    const existingUser = await User.findOne({ where: { email } });

    if (!existingUser) {
      return res.status(400).json({ error: { message: "User with this email doesn't exist" } });
    }

    if (!existingUser.is_verified) {
      return res.status(400).json({ error: { message: "Email not verified" } });
    }

    const isPasswordValid = await compare(password, existingUser.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: { message: "Password is invalid" } });
    }

    const accessToken = jwt.sign({ userId: existingUser.user_id, email }, process.env.JWT_ACCESS_TOKEN_SECRET as Secret, { expiresIn: `${ACCESS_TOKEN_EXPIRES_IN}s` });
    const refreshToken = jwt.sign({ userId: existingUser.user_id, email }, process.env.JWT_REFRESH_TOKEN_SECRET as Secret, { expiresIn: `${REFRESH_TOKEN_EXPIRES_IN}s` });

    return res.json({
      data: {
        user: {
          userId: existingUser.user_id,
          email: existingUser.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error occurred in loginUserController() -> ", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const tokenRefreshSchema = z.object({
  refreshToken: z.string({ required_error: "Refresh token is required" }),
});

export const tokenRefreshController = async (req: Request, res: Response) => {
  try {
    const { refreshToken: refreshTokenPayload } = tokenRefreshSchema.parse(req.body);

    const decodedToken = jwt.verify(refreshTokenPayload, process.env.JWT_REFRESH_TOKEN_SECRET as Secret) as { userId: string; email: string };

    if (!decodedToken) {
      return res.status(400).json({ error: { message: "Token invalid" } });
    }

    const accessToken = jwt.sign({ userId: decodedToken.userId, email: decodedToken.email }, process.env.JWT_ACCESS_TOKEN_SECRET as Secret, { expiresIn: `${ACCESS_TOKEN_EXPIRES_IN}s` });

    const refreshToken = jwt.sign({ userId: decodedToken.userId, email: decodedToken.email }, process.env.JWT_REFRESH_TOKEN_SECRET as Secret, { expiresIn: `${REFRESH_TOKEN_EXPIRES_IN}s` });

    return res.json({
      data: {
        user: {
          userId: decodedToken.userId,
          email: decodedToken.email,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error occurred in tokenRefreshController() -> ", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

export const meController = async (req: Request, res: Response) => {
  // @ts-ignore
  res.json({ data: { userId: req?.userId, email: req?.email, name: req?.name } });
};

const resetRequestSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const requestResetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = resetRequestSchema.parse(req.body);

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: { message: "User not found" } });

    const resetToken = uuid();
    const expiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes from now

    await user.update({
      reset_token: resetToken,
      reset_token_expiry: expiry,
    });

    const resetLink = `${process.env.CLIENT_APP_URL}/reset-password?token=${resetToken}`;

    const { subject, html } = passwordResetEmail({
      resetLink,
    });

    await sendEmail({ to: email, subject, html });

    res.json({ data: { message: "Reset link sent to email" } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error in requestResetPassword ->", e);
    res.status(500).json({ error: { message: e?.message || "Internal error" } });
  }
};

const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z
    .string()
    .min(8)
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/, "Password must be strong"),
});

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await User.findOne({ where: { reset_token: token } });

    if (!user || !user.reset_token_expiry || user.reset_token_expiry.getTime() < Date.now()) {
      return res.status(400).json({ error: { message: "Invalid or expired token" } });
    }

    const hashedPassword = await hash(newPassword, 12);

    await user.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expiry: null,
    });

    res.json({ data: { message: "Password reset successful" } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error in resetPassword ->", e);
    res.status(500).json({ error: { message: e?.message || "Internal error" } });
  }
};
