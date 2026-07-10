import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a lockfile exists higher up the tree).
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
