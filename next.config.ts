import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Emits a self-contained server bundle with only the files it actually
     needs, which is what the Docker image copies. Without it the runtime
     image has to carry the whole node_modules tree. Harmless on Vercel,
     which ignores it. */
  output: "standalone",
};

export default nextConfig;
