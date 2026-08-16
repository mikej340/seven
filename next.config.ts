import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.*"],
  ...(isGitHubPages
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath: "/seven",
      }
    : {}),
};

export default nextConfig;
