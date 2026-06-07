import { Request, Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import ApiKey from "../models/ApiKey";
import { generateApiKey } from "../utils/apiKey";

function status(k: ApiKey): "active" | "expired" | "revoked" {
  if (k.revoked) return "revoked";
  if (k.expires_at && k.expires_at.getTime() < Date.now()) return "expired";
  return "active";
}

function present(k: ApiKey) {
  return {
    api_key_id: k.api_key_id,
    name: k.name,
    key_prefix: k.key_prefix,
    created_at: k.created_at,
    last_used_at: k.last_used_at,
    expires_at: k.expires_at,
    revoked: k.revoked,
    status: status(k),
  };
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  expires_at: z
    .string()
    .datetime({ message: "expires_at must be an ISO date-time" })
    .optional()
    .nullable(),
});

export const createApiKeyController = async (req: Request, res: Response) => {
  try {
    const { name, expires_at } = createSchema.parse(req.body);

    let expiry: Date | null = null;
    if (expires_at) {
      expiry = new Date(expires_at);
      if (expiry.getTime() <= Date.now()) {
        return res.status(400).json({ error: { message: "Expiry must be in the future" } });
      }
    }

    const { key, key_prefix, key_hash } = generateApiKey();

    // @ts-ignore
    const userId = req.userId;
    const record = await ApiKey.create({
      api_key_id: uuid(),
      user_id: userId,
      name,
      key_prefix,
      key_hash,
      expires_at: expiry,
    });

    // `key` is returned exactly once and never stored in plaintext.
    return res.status(201).json({ data: { ...present(record), key } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    }
    console.error("createApiKeyController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

export const listApiKeysController = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    // @ts-ignore
    const { rows, count } = await ApiKey.findAndCountAll({
      // @ts-ignore
      where: { user_id: req.userId },
      order: [["created_at", "DESC"]],
      limit,
      offset,
    });
    return res.json({ data: { items: rows.map(present), total: count, limit, offset } });
  } catch (e: any) {
    console.error("listApiKeysController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

export const rotateApiKeyController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const record = await ApiKey.findOne({ where: { api_key_id: id, user_id: req.userId } });
    if (!record) return res.status(404).json({ error: { message: "API key not found" } });

    const { key, key_prefix, key_hash } = generateApiKey();
    await record.update({ key_prefix, key_hash, last_used_at: null, revoked: false });

    // New secret returned exactly once; the old one stops working immediately.
    return res.json({ data: { ...present(record), key } });
  } catch (e: any) {
    console.error("rotateApiKeyController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const renameApiKeySchema = z.object({ name: z.string().trim().min(1, "Name is required").max(100, "Name too long") });

export const renameApiKeyController = async (req: Request, res: Response) => {
  try {
    const { name } = renameApiKeySchema.parse(req.body);
    // @ts-ignore
    const record = await ApiKey.findOne({ where: { api_key_id: req.params.id, user_id: req.userId } });
    if (!record) return res.status(404).json({ error: { message: "API key not found" } });
    await record.update({ name });
    return res.json({ data: present(record) });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    console.error("renameApiKeyController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

export const deleteApiKeyController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const record = await ApiKey.findOne({ where: { api_key_id: id, user_id: req.userId } });
    if (!record) return res.status(404).json({ error: { message: "API key not found" } });

    await record.destroy();
    return res.json({ data: { api_key_id: id } });
  } catch (e: any) {
    console.error("deleteApiKeyController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};
