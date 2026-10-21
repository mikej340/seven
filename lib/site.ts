const DEFAULT_SITE_URL = "https://mikej340.github.io/seven/";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
const configuredCanonicalSiteUrl = process.env.CANONICAL_SITE_URL ?? configuredSiteUrl;

export const SITE_URL = new URL(configuredSiteUrl).href;
export const CANONICAL_SITE_URL = new URL(configuredCanonicalSiteUrl).href;

export const siteAssetUrl = (path: string) =>
  new URL(path.replace(/^\/+/, ""), SITE_URL).href;

export const canonicalUrl = (path: string) =>
  new URL(path.replace(/^\/+/, ""), CANONICAL_SITE_URL).href;
