import type { Config } from '@react-router/dev/config';

export default {
  basename: '/dashboard/email-inbox',
  ssr: false,
  buildDirectory: 'build',
  appDirectory: 'app',
  routeDiscovery: {
    mode: 'initial',
  },
  prerender: ['/manifest.webmanifest'],
  future: {
    unstable_viteEnvironmentApi: true,
  },
} satisfies Config;
