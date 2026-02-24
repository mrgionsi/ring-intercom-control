import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">
          Secure Ring intercom management for B&B guest access, daily operations,
          and admin governance.
        </p>
        <p>
          Supported languages: English, Italian, Spanish, German.
        </p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Get Started
          </Link>
          <Link
            className="button button--info button--lg"
            to="/docs/api/reference">
            API Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  const dashboardShot = useBaseUrl('/img/screenshots/dashboard.png');
  const guestLinksShot = useBaseUrl('/img/screenshots/guest_link.png');
  const settingsShot = useBaseUrl('/img/screenshots/settings.png');
  return (
    <Layout
      title={siteConfig.title}
      description="Ring Intercom Control documentation site.">
      <HomepageHeader />
      <main>
        <section className={styles.section}>
          <div className="container">
            <Heading as="h2">What It Does</Heading>
            <div className={styles.grid}>
              <article className={styles.card}>
                <Heading as="h3">Ring Integration</Heading>
                <p>Connect one or more Ring accounts and manage intercom devices per user.</p>
              </article>
              <article className={styles.card}>
                <Heading as="h3">Guest Links</Heading>
                <p>Create temporary scheduled guest links (ideal for B&B check-in windows) with expiration and maximum-use limits.</p>
              </article>
              <article className={styles.card}>
                <Heading as="h3">Role-Based Access</Heading>
                <p>Admin and user roles with scoped permissions and operational controls.</p>
              </article>
              <article className={styles.card}>
                <Heading as="h3">Audit & Security</Heading>
                <p>Session auth, CSRF protection, rate limits, and unlock/login audit trails.</p>
              </article>
              <article className={styles.card}>
                <Heading as="h3">Docker & CI</Heading>
                <p>Containerized services with CI testing and release workflows.</p>
              </article>
              <article className={styles.card}>
                <Heading as="h3">Internationalization</Heading>
                <p>English, Italian, Spanish, and German with runtime language switching.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt}>
          <div className="container">
            <Heading as="h2">UI Preview</Heading>
            <div className={styles.previewGrid}>
              <figure className={styles.previewItem}>
                <img src={dashboardShot} alt="Dashboard screenshot" />
                <figcaption>Dashboard</figcaption>
              </figure>
              <figure className={styles.previewItem}>
                <img src={guestLinksShot} alt="Guest links screenshot" />
                <figcaption>Guest Links</figcaption>
              </figure>
              <figure className={styles.previewItem}>
                <img src={settingsShot} alt="Settings screenshot" />
                <figcaption>Settings</figcaption>
              </figure>
            </div>
            <p className={styles.center}>
              <Link to="/docs/intro">See full gallery</Link>
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <Heading as="h2">Quick Start</Heading>
            <ol>
              <li>Configure backend environment variables (`SESSION_SECRET`, `MASTER_KEY`, `ADMIN_*`).</li>
              <li>Run backend and frontend development servers.</li>
              <li>Open the app and configure Ring integration from Settings.</li>
            </ol>
          </div>
        </section>

        <section className={styles.sectionAlt}>
          <div className="container">
            <Heading as="h2">Open Source</Heading>
            <div className={styles.linkRow}>
              <Link to="/docs/contributing">Contributing</Link>
              <Link to="/docs/security">Security</Link>
              <Link href="https://github.com/mrgionsi/ring-intercom-control/blob/dev/SUPPORT.md">Support</Link>
              <Link href="https://github.com/mrgionsi/ring-intercom-control">GitHub Repository</Link>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
