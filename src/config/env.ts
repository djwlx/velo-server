interface EnvType {
  appSecret: string;
}

export const ENV: EnvType = {
  appSecret: process.env.APP_SECRET as string,
};
