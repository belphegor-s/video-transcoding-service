import { createClient } from "redis";

const client = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: 17534,
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
