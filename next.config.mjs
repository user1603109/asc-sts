import fs from 'fs';
import path from 'path';

// Ensure public assets are available
try {
  const publicImgDir = path.join(process.cwd(), 'public', 'assets', 'img');
  if (!fs.existsSync(publicImgDir)) {
    fs.mkdirSync(publicImgDir, { recursive: true });
  }
  const srcLogo = path.join(process.cwd(), 'assets', 'img', 'astslogo.png');
  const destLogo = path.join(publicImgDir, 'astslogo.png');
  if (fs.existsSync(srcLogo) && !fs.existsSync(destLogo)) {
    fs.copyFileSync(srcLogo, destLogo);
  }
} catch (e) {
  console.warn('Could not copy logo:', e.message);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
