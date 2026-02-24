import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../api';
import { useTranslation } from 'react-i18next';
import { formatDateTime, toDateTimeLocalValue } from '../utils/dateTime';
import {
  getLinkStatus,
  statusClassFor,
  type GuestLinkStatus
} from './guestLinkStatus';
import { filterGuestLinks, paginateGuestLinks } from './guestLinksTable';
const PAGE_SIZE = 20;

type RingSummary = {
  ringAccountId: number;
  ringAccountLabel: string;
  locationId: string;
  locationName: string;
  intercoms: Array<{
    ringAccountId: number;
    ringAccountLabel: string;
    id: string;
    name: string;
  }>;
};

type GuestLink = {
  id: number;
  token: string;
  label: string | null;
  ringAccountId: number;
  intercomId: string;
  startsAt: string;
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
  const [ringAccountId, setRingAccountId] = useState('');
  const [intercomId, setIntercomId] = useState('');
  const [startsAt, setStartsAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [expiresAt, setExpiresAt] = useState(() =>
    toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [maxUses, setMaxUses] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDuration, setTemplateDuration] = useState('24');
  const [templateMaxUses, setTemplateMaxUses] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [searchLabel, setSearchLabel] = useState('');
  const [statusFilters, setStatusFilters] = useState<Record<GuestLinkStatus, boolean>>({
    valid: true,
    scheduled: true,
    expired: true,
    used_up: true,
    disabled: true,
    invalid_date: true
  });
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [initializing, setInitializing] = useState(true);
  const templateTriggerRef = useRef<HTMLButtonElement | null>(null);
  const templateFirstFieldRef = useRef<HTMLInputElement | null>(null);
  const modalCardRef = useRef<HTMLElement | null>(null);
  const templateModalTitleId = 'template-modal-title';
  const isCreateReady = Boolean(
    ringAccountId &&
    intercomId &&
      startsAt &&
      expiresAt &&
      Number.isFinite(new Date(startsAt).getTime()) &&
      Number.isFinite(new Date(expiresAt).getTime()) &&
      new Date(expiresAt).getTime() > new Date(startsAt).getTime()
  );

  const allIntercoms = useMemo(
    () =>
      summary.flatMap((location) =>
        location.intercoms.map((intercom) => ({
          id: intercom.id,
          ringAccountId: String(intercom.ringAccountId),
          ringAccountLabel: intercom.ringAccountLabel,
          name: `${intercom.name} (${location.locationName})`
        }))
      ),
    [summary]
  );
  const availableAccounts = useMemo(() => {
    const map = new Map<string, string>();
    for (const location of summary) {
      map.set(String(location.ringAccountId), location.ringAccountLabel);
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [summary]);
  const filteredIntercoms = allIntercoms.filter(
    (item) => !ringAccountId || item.ringAccountId === ringAccountId
  );

  const filteredLinks = filterGuestLinks(links, searchLabel, statusFilters);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const pagedLinks = paginateGuestLinks(filteredLinks, currentPage, PAGE_SIZE);

  const loadData = async () => {
    setLoadError(null);
    setInitializing(true);
    try {
      const [ring, guest, templatesRes] = await Promise.all([
        apiFetch<{ summary: RingSummary[] }>('/api/ring/summary'),
        apiFetch<{ links: GuestLink[] }>('/api/guest-links'),
        apiFetch<{ templates: GuestLinkTemplate[] }>('/api/guest-link-templates')
      ]);
      setSummary(ring.summary);
      setLinks(guest.links);
      setTemplates(templatesRes.templates);
    } catch (err: any) {
      console.error('Failed to load guest links data', err);
      setLoadError(err?.message ?? t('common.error'));
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!ringAccountId && availableAccounts.length > 0) {
      setRingAccountId(availableAccounts[0].id);
    }
  }, [ringAccountId, availableAccounts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchLabel, statusFilters]);

  useEffect(() => {
    if (!templateModalOpen) return;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    templateFirstFieldRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTemplateModalOpen(false);
        return;
      }
      if (event.key !== 'Tab') {
        return;
      }

      const container = modalCardRef.current;
      if (!container) return;
      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      const fallback = templateTriggerRef.current ?? previousActiveElement;
      fallback?.focus();
    };
  }, [templateModalOpen]);

  const handleCreate = async () => {
    setError(null);
    setToast(null);
    const nextErrors: Record<string, string> = {};
    if (!ringAccountId) {
      nextErrors.ringAccountId = t('guest_links.error_account_required');
    }
    if (!intercomId) {
      nextErrors.intercomId = t('guest_links.error_intercom_required');
    }
    if (!startsAt) {
      nextErrors.startsAt = t('guest_links.error_start_required');
    }
    if (!expiresAt) {
      nextErrors.expiresAt = t('guest_links.error_end_required');
    }
    const startDate = new Date(startsAt);
    const endDate = new Date(expiresAt);
    if (startsAt && !Number.isFinite(startDate.getTime())) {
      nextErrors.startsAt = t('guest_links.error_start_invalid');
    }
    if (expiresAt && !Number.isFinite(endDate.getTime())) {
      nextErrors.expiresAt = t('guest_links.error_end_invalid');
    }
    if (
      Number.isFinite(startDate.getTime()) &&
      Number.isFinite(endDate.getTime()) &&
      endDate.getTime() <= startDate.getTime()
    ) {
      nextErrors.expiresAt = t('guest_links.error_range');
    }
    const normalizedLabel = label.trim();
    if (normalizedLabel) {
      const duplicateActive = links.some(
        (link) =>
          String(link.ringAccountId) === ringAccountId &&
          (link.label ?? '').trim().toLowerCase() ===
            normalizedLabel.toLowerCase() &&
          getLinkStatus(link) === 'valid'
      );
      if (duplicateActive) {
        nextErrors.label = t('guest_links.error_duplicate_active_label');
      }
    }
    if (maxUses && (!Number.isInteger(Number(maxUses)) || Number(maxUses) <= 0)) {
      nextErrors.maxUses = t('guest_links.error_max_uses_invalid');
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      const payload = {
        label: normalizedLabel || undefined,
        ringAccountId: Number(ringAccountId),
        intercomId,
        startsAt: startDate.toISOString(),
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
      setToast(t('guest_links.created', { url }));
      setTimeout(() => setToast(null), 4000);
      await loadData();
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    }
  };

  const clearFieldError = (field: string) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSelectTemplate = (id: string) => {
    setTemplateId(id);
    const tmpl = templates.find((t) => String(t.id) === id);
    if (!tmpl) return;
    const start = new Date();
    const exp = new Date(start.getTime() + tmpl.duration_hours * 60 * 60 * 1000);
    setStartsAt(toDateTimeLocalValue(start));
    setExpiresAt(toDateTimeLocalValue(exp));
    setMaxUses(tmpl.max_uses ? String(tmpl.max_uses) : '');
    clearFieldError('startsAt');
    clearFieldError('expiresAt');
    clearFieldError('maxUses');
  };

  const handleCreateTemplate = async () => {
    setError(null);
    setToast(null);
    if (!templateName || !templateDuration) {
      setError(t('guest_links.template_required'));
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
      setToast(t('guest_links.template_created'));
      setTimeout(() => setToast(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    const confirmed = window.confirm(t('guest_links.template_delete_confirm'));
    if (!confirmed) return;
    try {
      await apiFetch(`/api/guest-link-templates/${id}`, { method: 'DELETE' });
      setToast(t('guest_links.template_deleted'));
      setTimeout(() => setToast(null), 2500);
      await loadData();
    } catch (err: any) {
      setError(err.message ?? t('common.error'));
    }
  };

  const handleDisable = async (id: number) => {
    setLinksError(null);
    try {
      await apiFetch(`/api/guest-links/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (err: any) {
      console.error('Failed to disable guest link', err);
      setLinksError(err.message ?? t('common.error'));
    }
  };

  const handleStartEdit = (link: GuestLink) => {
    setEditingLinkId(link.id);
    setEditExpiresAt(toDateTimeLocalValue(link.expiresAt));
    setLinksError(null);
  };

  const handleCancelEdit = () => {
    setEditingLinkId(null);
    setEditExpiresAt('');
  };

  const handleSaveEdit = async (link: GuestLink) => {
    setLinksError(null);
    const next = new Date(editExpiresAt);
    if (!Number.isFinite(next.getTime())) {
      setLinksError(t('guest_links.error_end_invalid'));
      return;
    }
    const start = Date.parse(link.startsAt);
    if (Number.isFinite(start) && next.getTime() <= start) {
      setLinksError(t('guest_links.error_range'));
      return;
    }
    try {
      await apiFetch(`/api/guest-links/${link.id}/expires-at`, {
        method: 'PATCH',
        body: JSON.stringify({ expiresAt: next.toISOString() })
      });
      setToast(t('guest_links.updated'));
      setTimeout(() => setToast(null), 3000);
      handleCancelEdit();
      await loadData();
    } catch (err: any) {
      console.error('Failed to update guest link expiresAt', err);
      setLinksError(err.message ?? t('common.error'));
    }
  };

  return (
    <div className={`stack ${initializing ? 'disabled' : ''}`}>
      {toast ? <div className="toast">{toast}</div> : null}
      {initializing ? (
        <div className="overlay">
          <div className="spinner" />
          <div>{t('app.loading')}</div>
        </div>
      ) : null}
      <section className="card">
        <h2 className="section-title">
          <UiIcon name="create" />
          {t('guest_links.create_title')}
        </h2>
        <div className="actions guest-link-actions">
          <p>{t('guest_links.template_hint')}</p>
          <button
            type="button"
            className="btn ghost nav-link"
            onClick={() => setTemplateModalOpen(true)}
            ref={templateTriggerRef}
          >
            <UiIcon name="template" />
            {t('guest_links.manage_templates')}
          </button>
        </div>
        <div className="grid two guest-link-form-grid guest-link-template-row">
          <label className="field">
            <span className="field-label">
              <UiIcon name="template" />
              {t('guest_links.template_optional')}
            </span>
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
        <div className="grid two guest-link-form-grid guest-link-main-row">
          <label className="field">
            <span className="field-label">
              <UiIcon name="intercom" />
              {t('guest_links.account')}
            </span>
            <select
              value={ringAccountId}
              onChange={(e) => {
                setRingAccountId(e.target.value);
                setIntercomId('');
                clearFieldError('ringAccountId');
              }}
            >
              <option value="">{t('guest_links.select_account')}</option>
              {availableAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                </option>
              ))}
            </select>
            {fieldErrors.ringAccountId ? (
              <span className="error">{fieldErrors.ringAccountId}</span>
            ) : null}
          </label>
          <label className="field">
            <span className="field-label">
              <UiIcon name="label" />
              {t('guest_links.label')}
            </span>
            <input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                clearFieldError('label');
              }}
            />
            {fieldErrors.label ? <span className="error">{fieldErrors.label}</span> : null}
          </label>
          <label className="field">
            <span className="field-label">
              <UiIcon name="intercom" />
              {t('guest_links.intercom')}
            </span>
            <select
              value={intercomId}
              onChange={(e) => {
                setIntercomId(e.target.value);
                clearFieldError('intercomId');
              }}
            >
              <option value="">{t('profile.select_intercom')}</option>
              {filteredIntercoms.map((intercom) => (
                <option key={`${intercom.ringAccountId}:${intercom.id}`} value={intercom.id}>
                  {intercom.name}
                </option>
              ))}
            </select>
            {fieldErrors.intercomId ? (
              <span className="error">{fieldErrors.intercomId}</span>
            ) : null}
          </label>
          <label className="field">
            <span className="field-label">
              <UiIcon name="calendar" />
              {t('guest_links.starts_at')}
            </span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => {
                setStartsAt(e.target.value);
                clearFieldError('startsAt');
              }}
            />
            {fieldErrors.startsAt ? (
              <span className="error">{fieldErrors.startsAt}</span>
            ) : null}
          </label>
          <label className="field">
            <span className="field-label">
              <UiIcon name="calendar" />
              {t('guest_links.expires_at')}
            </span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => {
                setExpiresAt(e.target.value);
                clearFieldError('expiresAt');
              }}
            />
            {fieldErrors.expiresAt ? (
              <span className="error">{fieldErrors.expiresAt}</span>
            ) : null}
            <span className="muted">{t('guest_links.date_format_hint')}</span>
          </label>
          <label className="field">
            <span className="field-label">
              <UiIcon name="uses" />
              {t('guest_links.max_uses')}
            </span>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => {
                setMaxUses(e.target.value);
                clearFieldError('maxUses');
              }}
            />
            {fieldErrors.maxUses ? (
              <span className="error">{fieldErrors.maxUses}</span>
            ) : null}
          </label>
        </div>
        <button
          type="button"
          className="btn guest-link-create-btn nav-link"
          onClick={handleCreate}
          disabled={!isCreateReady || initializing}
        >
          <UiIcon name="create" />
          {t('guest_links.create')}
        </button>
        {error ? <div className="error">{error}</div> : null}
      </section>

      <section className="card">
        <h2 className="section-title">
          <UiIcon name="links" />
          {t('guest_links.existing')}
        </h2>
        <div className="status-legend">
          <span className="badge ok">{t('guest_links.valid')}</span>
          <span className="muted">{t('guest_links.valid_desc')}</span>
          <span className="badge warn">{t('guest_links.scheduled')}</span>
          <span className="muted">{t('guest_links.scheduled_desc')}</span>
          <span className="badge danger">{t('guest_links.expired')}</span>
          <span className="muted">{t('guest_links.expired_desc')}</span>
          <span className="badge warn">{t('guest_links.used_up')}</span>
          <span className="muted">{t('guest_links.used_up_desc')}</span>
          <span className="badge disabled">{t('guest_links.disabled')}</span>
          <span className="muted">{t('guest_links.disabled_desc')}</span>
          <span className="badge danger">{t('guest_links.invalid_date')}</span>
          <span className="muted">{t('guest_links.invalid_date_desc')}</span>
        </div>
        <div className="links-filters">
          <label className="field links-search">
            <span className="field-label">
              <UiIcon name="search" />
              {t('guest_links.search_label')}
            </span>
            <input
              type="text"
              value={searchLabel}
              onChange={(e) => setSearchLabel(e.target.value)}
              placeholder={t('guest_links.search_placeholder')}
            />
          </label>
          <div className="links-status-toggles">
            {(
              ['valid', 'scheduled', 'expired', 'used_up', 'disabled', 'invalid_date'] as GuestLinkStatus[]
            ).map((status) => (
              <button
                key={status}
                type="button"
                className={`btn ghost filter-chip ${statusFilters[status] ? 'active' : ''}`}
                onClick={() =>
                  setStatusFilters((prev) => ({ ...prev, [status]: !prev[status] }))
                }
              >
                {statusLabelFor(status, t)}
              </button>
            ))}
          </div>
        </div>
        {linksError ? <div className="error">{linksError}</div> : null}
        {loadError ? <div className="error">{loadError}</div> : null}
        {filteredLinks.length === 0 ? (
          <p className="muted">
            {links.length === 0 ? t('guest_links.no_links') : t('guest_links.no_results')}
          </p>
        ) : (
          <div className="stack">
            <div className="links-table-wrap">
              <table className="links-table">
                <thead>
                  <tr>
                    <th>{t('guest_links.label')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('guest_links.starts_at')}</th>
                    <th>{t('guest_links.expires_at')}</th>
                    <th>{t('guest_links.uses')}</th>
                    <th>{t('guest_links.intercom')}</th>
                    <th>{t('guest_links.account')}</th>
                    <th>{t('guest_links.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedLinks.map((link) => (
                    <tr key={link.id}>
                      <td>{link.label || t('profile.guest_link')}</td>
                      <td>
                        <span className={`badge ${statusClassFor(getLinkStatus(link))}`}>
                          {statusLabelFor(getLinkStatus(link), t)}
                        </span>
                      </td>
                      <td>{formatDateTime(link.startsAt)}</td>
                      <td>
                        {editingLinkId === link.id ? (
                          <input
                            type="datetime-local"
                            value={editExpiresAt}
                            onChange={(e) => setEditExpiresAt(e.target.value)}
                          />
                        ) : (
                          formatDateTime(link.expiresAt)
                        )}
                      </td>
                      <td>
                        {link.uses}
                        {link.maxUses ? ` / ${link.maxUses}` : ''}
                      </td>
                      <td>{link.intercomId}</td>
                      <td>
                        {availableAccounts.find(
                          (account) => Number(account.id) === link.ringAccountId
                        )?.label ?? `#${link.ringAccountId}`}
                      </td>
                      <td>
                        <div className="links-table-actions">
                          <a
                            className="btn ghost nav-link"
                            href={`/guest/${link.token}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <UiIcon name="open" />
                            {t('guest_links.open')}
                          </a>
                          {editingLinkId === link.id ? (
                            <>
                              <button
                                type="button"
                                className="btn ghost nav-link"
                                onClick={() => handleCancelEdit()}
                              >
                                <UiIcon name="cancel" />
                                {t('guest_links.cancel')}
                              </button>
                              <button
                                type="button"
                                className="btn nav-link"
                                onClick={() => handleSaveEdit(link)}
                                disabled={!editExpiresAt}
                              >
                                <UiIcon name="save" />
                                {t('guest_links.save')}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn ghost nav-link"
                              onClick={() => handleStartEdit(link)}
                              disabled={link.disabled === 1}
                            >
                              <UiIcon name="edit" />
                              {t('guest_links.edit')}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn nav-link"
                            onClick={() => handleDisable(link.id)}
                            disabled={link.disabled === 1 || editingLinkId === link.id}
                          >
                            <UiIcon name="disable" />
                            {t('guest_links.disable')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="links-pagination">
              <button
                type="button"
                className="btn ghost"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                {t('guest_links.prev')}
              </button>
              <span className="muted">
                {t('guest_links.page')} {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn ghost"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                {t('guest_links.next')}
              </button>
            </div>
          </div>
        )}
      </section>

      {templateModalOpen ? (
        <div className="modal-backdrop" onClick={() => setTemplateModalOpen(false)}>
          <section
            className="card modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={templateModalTitleId}
            ref={modalCardRef}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setTemplateModalOpen(false)}
              aria-label={t('guest_links.close_templates')}
            >
              ×
            </button>
            <div className="actions">
              <h2 className="section-title" id={templateModalTitleId}>
                <UiIcon name="template" />
                {t('guest_links.templates_title')}
              </h2>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTemplateModalOpen(false)}
              >
                {t('guest_links.close_templates')}
              </button>
            </div>

            <div className="grid two">
              <label className="field">
                <span className="field-label">
                  <UiIcon name="label" />
                  {t('guest_links.template_name')}
                </span>
                <input
                  ref={templateFirstFieldRef}
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">
                  <UiIcon name="calendar" />
                  {t('guest_links.template_duration')}
                </span>
                <input
                  type="number"
                  min="1"
                  value={templateDuration}
                  onChange={(e) => setTemplateDuration(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">
                  <UiIcon name="uses" />
                  {t('guest_links.template_max_uses')}
                </span>
                <input
                  type="number"
                  min="1"
                  value={templateMaxUses}
                  onChange={(e) => setTemplateMaxUses(e.target.value)}
                />
              </label>
            </div>
            <button type="button" className="btn nav-link" onClick={handleCreateTemplate}>
              <UiIcon name="create" />
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
                        {t('guest_links.template_max_uses')}:{' '}
                        {tmpl.max_uses ?? t('guest_links.template_unlimited')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                    >
                      {t('guest_links.template_delete')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

function statusLabelFor(status: GuestLinkStatus, t: (key: string) => string): string {
  if (status === 'disabled') return t('guest_links.disabled');
  if (status === 'used_up') return t('guest_links.used_up');
  if (status === 'scheduled') return t('guest_links.scheduled');
  if (status === 'expired') return t('guest_links.expired');
  if (status === 'invalid_date') return t('guest_links.invalid_date');
  return t('guest_links.valid');
}

function UiIcon({
  name
}: {
  name:
    | 'create'
    | 'template'
    | 'intercom'
    | 'calendar'
    | 'uses'
    | 'label'
    | 'links'
    | 'open'
    | 'edit'
    | 'disable'
    | 'save'
    | 'cancel'
    | 'search';
}) {
  const common = {
    className: 'nav-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  };

  if (name === 'create') {
    return (
      <svg {...common}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  }
  if (name === 'template') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="8" y1="8" x2="16" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  if (name === 'intercom') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="14" r="1.5" />
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
    );
  }
  if (name === 'uses') {
    return (
      <svg {...common}>
        <path d="M8 10h8" />
        <path d="M8 14h5" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  if (name === 'label') {
    return (
      <svg {...common}>
        <path d="M20 10l-8 8-8-8V4h10z" />
        <circle cx="11" cy="9" r="1.5" />
      </svg>
    );
  }
  if (name === 'open') {
    return (
      <svg {...common}>
        <path d="M14 4h6v6" />
        <path d="M10 14L20 4" />
        <path d="M20 14v6h-16V4h6" />
      </svg>
    );
  }
  if (name === 'edit') {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    );
  }
  if (name === 'disable') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <line x1="8" y1="8" x2="16" y2="16" />
      </svg>
    );
  }
  if (name === 'save') {
    return (
      <svg {...common}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (name === 'cancel') {
    return (
      <svg {...common}>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <line x1="20" y1="20" x2="16.5" y2="16.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11 5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 19" />
    </svg>
  );
}
