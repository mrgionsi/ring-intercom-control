import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Ring Intercom Control Docs',
  tagline: 'Setup, deployment, and operations documentation',
  favicon: 'img/favicon.ico',
  future: {
    v4: true,
  },
  url: 'https://mrgionsi.github.io',
  baseUrl: '/',
  organizationName: 'mrgionsi',
  projectName: 'ring-intercom-control',
  onBrokenLinks: 'throw',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/mrgionsi/ring-intercom-control/tree/dev/website/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/mrgionsi/ring-intercom-control/tree/dev/website/',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Ring Intercom Docs',
      logo: {
        alt: 'Ring Intercom Control',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/mrgionsi/ring-intercom-control',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/mrgionsi/ring-intercom-control',
            },
            {
              label: 'Issues',
              href: 'https://github.com/mrgionsi/ring-intercom-control/issues',
            },
          ],
        },
      ],
      copyright: `Copyright (c) ${new Date().getFullYear()} Ring Intercom Control contributors.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
