import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.*", "*.trycloudflare.com"],
  ...(isGitHubPages
    ? {
        output: "export" as const,
        trailingSlash: true,
        ...(basePath === "" ? {} : { basePath }),
      }
    : {}),
};

export default nextConfig;
