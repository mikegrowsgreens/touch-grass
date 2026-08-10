import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Built locally, shipped as artifacts — the droplet OOM-kills Next builds.
  output: "standalone",
};

export default nextConfig;
