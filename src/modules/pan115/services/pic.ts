import type { Handler } from 'hono';

export const getRandomPic: Handler = (c) => {
  return c.json({
    hello: '1',
  });
};

export const cacheFileIdInDB: Handler = (c) => {};
