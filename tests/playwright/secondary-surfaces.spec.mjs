import { test, expect } from './fixtures/offline-ui-assets.mjs';

test('access management rejects invalid credentials and restores then forgets an authenticated session', async ({ page }) => {
  test.skip(!process.env.PROMETHEUS_ADMIN_TOKEN, 'Requires the isolated runner admin token.');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/valerian-admin/');
  await page.getByTestId('admin-token-input').fill('invalid-qa-token');
  await page.getByTestId('submit-admin-token').click();
  await expect(page.getByTestId('admin-token-status')).toHaveText('Admin token rejected.');
  await expect(page.getByTestId('admin-shell')).toBeHidden();
  await page.getByTestId('admin-token-input').fill(process.env.PROMETHEUS_ADMIN_TOKEN);
  await page.getByTestId('submit-admin-token').click();
  await expect(page.getByTestId('admin-connection-state')).toHaveText('Admin Connected');
  await expect(page.getByTestId('access-code-list')).toContainText('RM014');
  await page.reload();
  await expect(page.getByTestId('admin-connection-state')).toHaveText('Admin Connected');
  await page.getByTestId('forget-admin-token').click();
  await expect(page.getByTestId('admin-shell')).toBeHidden();
  await expect(page.getByTestId('admin-token-input')).toHaveValue('');
  expect(await page.evaluate(() => sessionStorage.getItem('prometheus.valerianAdmin.adminToken') === null)).toBe(true);
  await page.reload();
  await expect(page.getByTestId('admin-token-panel')).toBeVisible();
  await expect(page.getByTestId('admin-shell')).toBeHidden();
  expect(errors).toEqual([]);
});

test('multilateral listener refuses to start without an agent and never opens media', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.qaMediaRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      window.qaMediaRequests++;
      throw new Error('Unexpected media request without an agent');
    };
  });
  await page.goto('/multilateral/listen/');
  await expect(page.getByText('Missing agent id in URL. Use ?agentId=UUID.')).toBeVisible();
  await expect(page.locator('#toggle_listen')).toBeDisabled();
  expect(await page.evaluate(() => window.qaMediaRequests)).toBe(0);
  expect(errors).toEqual([]);
});
