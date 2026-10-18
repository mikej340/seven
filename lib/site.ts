const DEFAULT_SITE_URL = "https://mikej340.github.io/seven/";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;

export const SITE_URL = new URL(configuredSiteUrl).href;

export const siteAssetUrl = (path: string) =>
  new URL(path.replace(/^\/+/, ""), SITE_URL).href;
