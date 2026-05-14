import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  // better-sqlite3 and its native bindings must not be bundled
  serverExternalPackages: ['better-sqlite3', 'bindings', 'node-gyp-build'],
  transpilePackages: ['@looop/db', '@looop/auth', '@looop/audit', '@looop/permissions', '@looop/ui'],
  webpack(config, { isServer }) {
    if (isServer) {
      // Ensure native addons and their resolution helpers are external
      const existingExternals = config.externals ?? [];
      const externalsArray = Array.isArray(existingExternals)
        ? existingExternals
        : [existingExternals];
      config.externals = [
        ...externalsArray,
        'better-sqlite3',
        'bindings',
        'node-gyp-build',
      ];
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self)' },
          // Lark embed: frame-ancestors を Lark 配信ドメインに合わせて運用時に絞る
          // 例: feishu.cn / larksuite.com / *.feishu.cn / *.larksuite.com
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://*.feishu.cn https://*.larksuite.com https://*.larkoffice.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
