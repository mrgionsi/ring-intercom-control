export function detectLanguage(
  storedLanguage: string | null,
  browserLanguage: string | null
): string {
  const supported = new Set(['en', 'it', 'es', 'de']);
  if (storedLanguage && supported.has(storedLanguage)) {
    return storedLanguage;
  }

  const lang = (browserLanguage ?? '').toLowerCase();
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('de')) return 'de';
  return 'en';
}
