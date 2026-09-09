import pino from 'pino';

export const rootLogger = pino({
  hooks: {
    streamWrite: (log) => `${log}\n`,
  },
});
