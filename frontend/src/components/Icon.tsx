type IconName =
  | 'dashboard'
  | 'links'
  | 'settings'
  | 'users'
  | 'account'
  | 'logout'
  | 'language'
  | 'intercom'
  | 'phone'
  | 'trash'
  | 'unlock'
  | 'battery'
  | 'signal'
  | 'status'
  | 'firmware'
  | 'wifi'
  | 'ota';

const iconProps = {
  className: 'nav-icon',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '2',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true
};

export function Icon({ name }: { name: IconName }) {
  if (name === 'dashboard') {
    return (
      <svg {...iconProps}>
        <rect x="3" y="3" width="8" height="8" />
        <rect x="13" y="3" width="8" height="5" />
        <rect x="13" y="10" width="8" height="11" />
        <rect x="3" y="13" width="8" height="8" />
      </svg>
    );
  }
  if (name === 'links') {
    return (
      <svg {...iconProps}>
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11 5" />
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 19" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 3.4l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  if (name === 'users') {
    return (
      <svg {...iconProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    );
  }
  if (name === 'language') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15 15 0 0 1 0 20" />
        <path d="M12 2a15 15 0 0 0 0 20" />
      </svg>
    );
  }
  if (name === 'logout') {
    return (
      <svg {...iconProps}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    );
  }
  if (name === 'intercom') {
    return (
      <svg {...iconProps}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <circle cx="12" cy="14" r="1.5" />
      </svg>
    );
  }
  if (name === 'account') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    );
  }
  if (name === 'phone') {
    return (
      <svg {...iconProps}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.2 19.2 0 0 1-5.9-5.9A19.8 19.8 0 0 1 2.2 4.3 2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .8 2.9a2 2 0 0 1-.5 2.1L8.2 10a16 16 0 0 0 5.8 5.8l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.7 2.9.8a2 2 0 0 1 1.7 2.1z" />
      </svg>
    );
  }
  if (name === 'trash') {
    return (
      <svg {...iconProps}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M6 6l1 14h10l1-14" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    );
  }
  if (name === 'unlock') {
    return (
      <svg {...iconProps}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0" />
      </svg>
    );
  }
  if (name === 'battery') {
    return (
      <svg {...iconProps}>
        <rect x="3" y="7" width="16" height="10" rx="2" />
        <line x1="21" y1="10" x2="21" y2="14" />
      </svg>
    );
  }
  if (name === 'signal') {
    return (
      <svg {...iconProps}>
        <line x1="4" y1="20" x2="4" y2="16" />
        <line x1="9" y1="20" x2="9" y2="12" />
        <line x1="14" y1="20" x2="14" y2="8" />
        <line x1="19" y1="20" x2="19" y2="4" />
      </svg>
    );
  }
  if (name === 'status') {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }
  if (name === 'firmware') {
    return (
      <svg {...iconProps}>
        <path d="M12 3v8" />
        <path d="M8 9l4 4 4-4" />
        <rect x="4" y="15" width="16" height="6" rx="2" />
      </svg>
    );
  }
  if (name === 'wifi') {
    return (
      <svg {...iconProps}>
        <path d="M5 9a10 10 0 0 1 14 0" />
        <path d="M8 12a6 6 0 0 1 8 0" />
        <path d="M11 15a2 2 0 0 1 2 0" />
        <circle cx="12" cy="19" r="1" />
      </svg>
    );
  }
  return (
    <svg {...iconProps}>
      <path d="M12 2v6" />
      <path d="M12 22v-6" />
      <path d="M4.93 4.93l4.24 4.24" />
      <path d="M14.83 14.83l4.24 4.24" />
      <path d="M2 12h6" />
      <path d="M22 12h-6" />
      <path d="M4.93 19.07l4.24-4.24" />
      <path d="M14.83 9.17l4.24-4.24" />
    </svg>
  );
}
