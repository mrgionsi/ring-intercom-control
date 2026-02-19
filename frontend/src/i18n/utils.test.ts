import { describe, expect, it } from 'vitest';
import { detectLanguage } from './utils';

describe('detectLanguage', () => {
  it('uses stored language if present', () => {
    expect(detectLanguage('es', 'en-US')).toBe('es');
  });

  it('detects italian from browser language', () => {
    expect(detectLanguage(null, 'it-IT')).toBe('it');
  });

  it('detects german from browser language', () => {
    expect(detectLanguage(null, 'de-DE')).toBe('de');
  });

  it('falls back to english', () => {
    expect(detectLanguage(null, 'pt-BR')).toBe('en');
  });
});
