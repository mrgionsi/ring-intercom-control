import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'architecture',
    'deployment',
    'environment',
    {
      type: 'category',
      label: 'API',
      items: ['api/index', 'api/reference'],
    },
    'development',
    'security',
    'contributing',
  ],
};

export default sidebars;
