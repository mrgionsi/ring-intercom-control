import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Settings from './Settings';

const apiFetchMock = vi.fn();

vi.mock('../api', () => ({
  apiFetch: (...args: any[]) => apiFetchMock(...args)
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', resolvedLanguage: 'en' }
  })
}));

function primeDefaultApiMocks() {
  apiFetchMock.mockImplementation((path: string, options?: RequestInit) => {
    if (path === '/api/ring/status') {
      return Promise.resolve({
        accounts: [
          {
            id: 1,
            label: 'Primary',
            isDefault: true,
            configured: true,
            updatedAt: new Date().toISOString()
          }
        ]
      });
    }
    if (path === '/api/ring/summary') {
      return Promise.resolve({
        summary: [
          {
            ringAccountId: 1,
            locationName: 'Home',
            intercoms: [
              {
                ringAccountId: 1,
                id: 'ic-1',
                name: 'Ingresso',
                data: {},
                batteryPercent: 90,
                connection: 'online',
                rssi: -40
              }
            ]
          }
        ]
      });
    }
    if (path === '/api/ring/accounts/1' && options?.method === 'DELETE') {
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({});
  });
}

describe('Settings modal interactions', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    apiFetchMock.mockReset();
    primeDefaultApiMocks();
  });

  it('closes add integration modal with Escape key', async () => {
    render(<Settings />);

    await screen.findAllByText('settings.add_integration');
    fireEvent.click(screen.getAllByText('settings.add_integration')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('closes add integration modal on backdrop click', async () => {
    render(<Settings />);

    await screen.findAllByText('settings.add_integration');
    fireEvent.click(screen.getAllByText('settings.add_integration')[0]);
    const backdrop = document.querySelector('.modal-backdrop');
    expect(backdrop).toBeTruthy();
    fireEvent.mouseDown(backdrop!);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('opens delete modal and cancels without calling delete endpoint', async () => {
    render(<Settings />);

    await screen.findAllByText('settings.delete_account');
    fireEvent.click(screen.getAllByText('settings.delete_account')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('ring.cancel'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(apiFetchMock).not.toHaveBeenCalledWith('/api/ring/accounts/1', expect.anything());
  });
});
