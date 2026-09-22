const TITLE = 'Yachtbase Email';
const DESCRIPTION =
  'Yachtbase email workspace with AI-powered inbox chat, labeling, writing assistance, and thread summaries.';

export const siteConfig = {
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: '/favicon.ico',
  },
  applicationName: 'Yachtbase',
  creator: 'Yachtbase',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${import.meta.env.VITE_PUBLIC_APP_URL}/og.png`,
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  category: 'Email Client',
  alternates: {
    canonical: import.meta.env.VITE_PUBLIC_APP_URL,
  },
  keywords: [
    'Mail',
    'Email',
    'Open Source',
    'Email Client',
    'Gmail Alternative',
    'Webmail',
    'Secure Email',
    'Email Management',
    'Email Platform',
    'Communication Tool',
    'Productivity',
    'Business Email',
    'Personal Email',
    'Mail Server',
    'Email Software',
    'Collaboration',
    'Message Management',
    'Digital Communication',
    'Email Service',
    'Web Application',
  ],
  //   metadataBase: new URL(import.meta.env.VITE_PUBLIC_APP_URL!),
};
