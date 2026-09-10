/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Autorise les images Unsplash de ta DB
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4004', // Autorise tes propres uploads locaux
      },
    ],
  },
};

export default nextConfig;