const Redis = require('ioredis');

let redisClient;

async function getRedisClient() {
  if (!process.env.UPSTASH_REDIS_URL) return null;

  if (!redisClient) {
    redisClient = new Redis(process.env.UPSTASH_REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false
    });
  }

  if (redisClient.status === 'wait') {
    await redisClient.connect();
  }

  return redisClient;
}

async function cached(key, ttlSeconds, resolver) {
  const client = await getRedisClient().catch(() => null);
  if (!client) return resolver();

  try {
    const hit = await client.get(key);
    if (hit) return JSON.parse(hit);
  } catch (error) {
    return resolver();
  }

  const value = await resolver();

  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    // Cache writes must not block the control-room API.
  }

  return value;
}

async function invalidate(keys) {
  const client = await getRedisClient().catch(() => null);
  if (!client) return;

  try {
    await client.del(...keys);
  } catch (error) {
    // Cache invalidation is best effort.
  }
}

module.exports = {
  cached,
  invalidate
};
