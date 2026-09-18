interface EnvType {
  appSecret: string;
  updateProxy?: string;
}

export const ENV: EnvType = {
  appSecret: process.env.APP_SECRET as string,
  updateProxy:
    process.env.UPDATE_PROXY?.trim() ||
    process.env.PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    undefined,
};
