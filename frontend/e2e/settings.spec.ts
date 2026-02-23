import { expect, test } from '@playwright/test';

const username = process.env.E2E_USERNAME ?? 'admin';
const password = process.env.E2E_PASSWORD ?? 'e2e-admin-pass';

test.describe('Settings page e2e', () => {
  test('supports integration and delete modal interactions', async ({ page }) => {
    await page.goto('/login');
    await page.waitForFunction(() => Boolean(localStorage.getItem('csrfToken')));

    await page.locator('input[autocomplete="username"]').fill(username);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.locator('button.login-button').click();

    await expect(page).toHaveURL('/');

    await page.goto('/settings');
    await expect(page.locator('h2').first()).toContainText('Settings');

    const addIntegrationButton = page.locator('.settings-head-actions button').first();
    await addIntegrationButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await addIntegrationButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog')).toBeHidden();

    const csrfToken = await page.evaluate(() => localStorage.getItem('csrfToken') ?? '');
    await page.request.post('/api/ring/accounts', {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      data: { label: `E2E Account ${Date.now()}` }
    });

    await page.reload();

    const deleteBtn = page.locator('.settings-account-actions .btn.danger').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(deleteDialog).toBeHidden();
  });
});
