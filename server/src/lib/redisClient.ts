import { createClient } from "redis";
import { env } from "../config/env";

const client = createClient({
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
});

let isConnected = false;

export const getRedisClient = async () => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
  return client;
};
