import fs from 'fs';
import path from 'path';

// Ensure public assets are available and synchronized
try {
  const publicImgDir = path.join(process.cwd(), 'public', 'assets', 'img');
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicImgDir)) {
    fs.mkdirSync(publicImgDir, { recursive: true });
  }

  const srcAstsLogo = path.join(process.cwd(), 'assets', 'img', 'astslogo.png');
  const srcAscLogo = path.join(process.cwd(), 'assets', 'img', 'asclogo.png');

  if (fs.existsSync(srcAstsLogo)) {
    fs.copyFileSync(srcAstsLogo, path.join(publicImgDir, 'astslogo.png'));
    fs.copyFileSync(srcAstsLogo, path.join(publicDir, 'astslogo.png'));
    const astsFolder = path.join(process.cwd(), 'ASTS', 'assets', 'img');
    if (fs.existsSync(astsFolder)) {
      fs.copyFileSync(srcAstsLogo, path.join(astsFolder, 'astslogo.png'));
    }
  }

  // Optimize oversized logos automatically if larger than 1MB
  const optScript = path.join(process.cwd(), 'scripts', 'optimize-logos.py');
  if (fs.existsSync(srcAscLogo) && fs.existsSync(optScript)) {
    const stats = fs.statSync(srcAscLogo);
    if (stats.size > 1024 * 1024) {
      try {
        const { execSync } = await import('child_process');
        execSync(`python "${optScript}"`, { stdio: 'ignore' });
      } catch (_) {}
    }
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
