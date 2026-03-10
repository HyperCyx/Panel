/** @type {import('next').NextConfig} */
const port = process.env.PORT || '3000';
const codespaceName = process.env.CODESPACE_NAME;
const codespacesDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
const codespacesHosts = codespaceName && codespacesDomain
  ? [
      `${codespaceName}-${port}.${codespacesDomain}`,
      `${codespaceName}-3000.${codespacesDomain}`,
      `${codespaceName}-3001.${codespacesDomain}`,
    ]
  : [];

const nextConfig = {
  allowedDevOrigins: [
    `localhost:${port}`,
    `127.0.0.1:${port}`,
    'localhost:3000',
    'localhost:3001',
    '127.0.0.1:3000',
    '127.0.0.1:3001',
    '*.app.github.dev',
    ...codespacesHosts,
  ],
  productionBrowserSourceMaps: false,
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
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        `localhost:${port}`,
        `127.0.0.1:${port}`,
        'localhost:3000',
        'localhost:3001',
        '127.0.0.1:3000',
        '127.0.0.1:3001',
        '*.app.github.dev',
        ...codespacesHosts,
      ],
    },
  },

};

export default nextConfig;
