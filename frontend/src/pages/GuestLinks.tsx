import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';

type RingSummary = {
  locationId: string;
  locationName: string;
  intercoms: Array<{
    id: string;
    name: string;
  }>;
};

type GuestLink = {
  id: number;
  token: string;
  label: string | null;
  intercomId: string;
  expiresAt: string;
  maxUses: number | null;
  uses: number;
  disabled: number;
};

type GuestLinkTemplate = {
  id: number;
  name: string;
  duration_hours: number;
  max_uses: number | null;
};

export default function GuestLinks() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<RingSummary[]>([]);
  const [links, setLinks] = useState<GuestLink[]>([]);
  const [templates, setTemplates] = useState<GuestLinkTemplate[]>([]);
  const [label, setLabel] = useState('');
  const [intercomId, setIntercomId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDuration, setTemplateDuration] = useState('24');
  const [templateMaxUses, setTemplateMaxUses] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const allIntercoms = useMemo(
    () =>
      summary.flatMap((location) =>
        location.intercoms.map((intercom) => ({
          id: intercom.id,
          name: `${intercom.name} (${location.locationName})`
        }))
      ),
    [summary]
  );

  const loadData = async () => {
    setInitializing(true);
    try {
      const ring = await apiFetch<{ summary: RingSummary[] }>(
        '/api/ring/summary'
      );
      const guest = await apiFetch<{ links: GuestLink[] }>(
        '/api/guest-links'
      );
      const templatesRes = await apiFetch<{ templates: GuestLinkTemplate[] }>(
        '/api/guest-link-templates'
      );
      setSummary(ring.summary);
      setLinks(guest.links);
      setTemplates(templatesRes.templates);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => null);
  }, []);

  const handleCreate = async () => {
    setError(null);
    setMessage(null);
    if (!intercomId || !expiresAt) {
      setError('Intercom and expiration are required.');
      return;
    }
    try {
      const payload = {
        label: label || undefined,
        intercomId,
        expiresAt: new Date(expiresAt).toISOString(),
        maxUses: maxUses ? Number(maxUses) : undefined
      };
      const result = await apiFetch<{ link: GuestLink }>(
        '/api/guest-links',
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );
      const url = `${window.location.origin}/guest/${result.link.token}`;
      setMessage(t('guest_links.created', { url }));
      await loadData();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    }
  };

  const handleSelectTemplate = (id: string) => {
    setTemplateId(id);
    const tmpl = templates.find((t) => String(t.id) === id);
    if (!tmpl) return;
    const exp = new Date(Date.now() + tmpl.duration_hours * 60 * 60 * 1000);
    setExpiresAt(exp.toISOString().slice(0, 16));
    setMaxUses(tmpl.max_uses ? String(tmpl.max_uses) : '');
  };

  const handleCreateTemplate = async () => {
    setError(null);
    setMessage(null);
    if (!templateName || !templateDuration) {
      setError('Template name and duration are required.');
      return;
    }
    try {
      await apiFetch('/api/guest-link-templates', {
        method: 'POST',
        body: JSON.stringify({
          name: templateName,
          durationHours: Number(templateDuration),
          maxUses: templateMaxUses ? Number(templateMaxUses) : undefined
        })
      });
      setTemplateName('');
      setTemplateDuration('24');
      setTemplateMaxUses('');
      setMessage('Template created.');
      await loadData();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    await apiFetch(`/api/guest-link-templates/${id}`, { method: 'DELETE' });
    await loadData();
  };

  const handleDisable = async (id: number) => {
    await apiFetch(`/api/guest-links/${id}`, { method: 'DELETE' });
    await loadData();
  };

  return (
    <div className={`stack ${initializing ? 'disabled' : ''}`}>
      {initializing ? (
        <div className="overlay">
          <div className="spinner" />
          <div>{t('app.loading')}</div>
        </div>
      ) : null}
      <section className="card">
        <h2>{t('guest_links.create_title')}</h2>
        <div className="grid two">
          <label className="field">
            <span>{t('guest_links.template_optional')}</span>
            <select
              value={templateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
            >
              <option value="">{t('profile.no_templates')}</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id}>
                  {tmpl.name} · {tmpl.duration_hours}h
                  {tmpl.max_uses ? ` · max ${tmpl.max_uses}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid two">
          <label className="field">
            <span>{t('guest_links.label')}</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="field">
            <span>{t('guest_links.intercom')}</span>
            <select
              value={intercomId}
              onChange={(e) => setIntercomId(e.target.value)}
            >
              <option value="">{t('profile.select_intercom')}</option>
              {allIntercoms.map((intercom) => (
                <option key={intercom.id} value={intercom.id}>
                  {intercom.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('guest_links.expires_at')}</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('guest_links.max_uses')}</span>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </label>
        </div>
        <button className="btn" onClick={handleCreate}>
          {t('guest_links.create')}
        </button>
        {message ? <div className="success">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="card">
        <h2>{t('guest_links.templates_title')}</h2>
        <div className="grid two">
          <label className="field">
            <span>{t('guest_links.template_name')}</span>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('guest_links.template_duration')}</span>
            <input
              type="number"
              min="1"
              value={templateDuration}
              onChange={(e) => setTemplateDuration(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('guest_links.template_max_uses')}</span>
            <input
              type="number"
              min="1"
              value={templateMaxUses}
              onChange={(e) => setTemplateMaxUses(e.target.value)}
            />
          </label>
        </div>
        <button className="btn" onClick={handleCreateTemplate}>
          {t('guest_links.template_create')}
        </button>
        {templates.length === 0 ? (
          <p className="muted">{t('guest_links.template_none')}</p>
        ) : (
          <div className="stack">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="tile">
                <div>
                  <strong>{tmpl.name}</strong>
                  <div className="muted">
                    {t('guest_links.template_duration')}: {tmpl.duration_hours}h
                  </div>
                  <div className="muted">
                    {t('guest_links.template_max_uses')}: {tmpl.max_uses ?? t('guest_links.template_unlimited')}
                  </div>
                </div>
                <button
                  className="btn ghost"
                  onClick={() => handleDeleteTemplate(tmpl.id)}
                >
                  {t('guest_links.disable')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t('guest_links.existing')}</h2>
        {links.length === 0 ? (
          <p className="muted">{t('guest_links.no_links')}</p>
        ) : (
          <div className="stack">
            {links.map((link) => (
              <div key={link.id} className="tile">
                <div>
                  <strong>{link.label || 'Guest Link'}</strong>
                  <div className="muted">
                    Expires: {new Date(link.expiresAt).toLocaleString()}
                  </div>
                  <div className="muted">
                    Uses: {link.uses}
                    {link.maxUses ? ` / ${link.maxUses}` : ''}
                  </div>
                  <div className="muted">Intercom ID: {link.intercomId}</div>
                </div>
                <div className="actions">
                  <a
                    className="btn ghost"
                    href={`/guest/${link.token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('guest_links.open')}
                  </a>
                  <button
                    className="btn"
                    onClick={() => handleDisable(link.id)}
                  >
                    {t('guest_links.disable')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
