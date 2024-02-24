import crypto from "crypto";

interface EncryptedData {
	iv: string;
	encryptedData: string;
}

export const encryptData = (data: any, key: string): EncryptedData => {
	const iv = crypto.randomBytes(16).toString("hex");
	const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv, "hex"));
	let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
	encrypted += cipher.final("hex");
	return { iv, encryptedData: encrypted };
};

export const decryptData = (encryptedData: EncryptedData, key: string): any => {
	const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(encryptedData.iv, "hex"));
	let decrypted = decipher.update(encryptedData.encryptedData, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return JSON.parse(decrypted);
};
