export function detectLanguage(
  storedLanguage: string | null,
  browserLanguage: string | null
): string {
  if (storedLanguage) return storedLanguage;

  const lang = (browserLanguage ?? '').toLowerCase();
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('de')) return 'de';
  return 'en';
}
