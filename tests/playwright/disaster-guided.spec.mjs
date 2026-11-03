import { test, expect } from './fixtures/offline-ui-assets.mjs';

const type = 'core.disaster_mission_configuration';
async function setup(page, request) {
  const admin = {'X-Prometheus-Admin-Token':process.env.PROMETHEUS_ADMIN_TOKEN};
  const code = Math.random().toString(36).slice(2,7).toUpperCase();
  const issued = await request.post('/admin/access-codes', {headers:admin,data:{code,enabled:true}});
  expect(issued.status()).toBe(201); const scope = await issued.json();
  expect((await request.put(`/admin/access-codes/${scope.id}/agent-types`, {headers:admin,data:{agentTypeKeys:[type]}})).ok()).toBe(true);
  const grant = await request.post('/admin/disaster/supervisors',{headers:admin,data:{scopeId:scope.id,name:'Guided test supervisor'}});
  expect(grant.status()).toBe(201); const token = (await grant.json()).token;
  await page.goto('/valerian/'); await page.getByTestId('access-code-input').fill(code); await page.getByTestId('submit-access-code').click();
  await page.locator('#open_diagnostics').click(); await page.getByTestId('agent-type-select').selectOption(type);
  const created = page.waitForResponse(r => r.url().endsWith('/demo/agents') && r.request().method() === 'POST');
  await page.getByTestId('create-agent-instance').click(); const agent = await (await created).json();
  await connect(page,agent.id);
  await expect(page.getByTestId('mission-demo')).toBeEnabled();
  return {code,token,id:agent.id};
}
async function connect(page,id) {
  await page.getByTestId('agent-select').selectOption(id); await page.getByTestId('connect-agent').click();
  await expect(page.getByTestId('agent-connection-state')).toContainText(`Connected to ${id}`);
  await expect(page.locator('#diagnostics_drawer')).not.toHaveClass(/showing/);
  await page.locator('#diagnostics_drawer').getByRole('button',{name:'Close',exact:true}).click();
}
async function approve(page,token) {
  await page.getByText('Mission supervisor review',{exact:true}).click();
  await page.getByTestId('mission-review-token').fill(token); await page.locator('[data-decision="approve"]').click();
  await expect(page.getByTestId('mission-review-status')).toContainText('Recorded: approve');
}
test.beforeEach(() => test.skip(!process.env.PROMETHEUS_ADMIN_TOKEN || !process.env.PROMETHEUS_LIVE_EXPECT_ENABLED,'Use the isolated acceptance runner.'));

for (const variant of ['ordinary','obstacle','failure','timeout']) test(`Guided demo ${variant}: readable result and valid controls`,async ({page,request},info) => {
  const credentials = await setup(page,request);
  await expect(page.getByTestId('shortcut-ready')).toBeHidden();
  await expect(page.locator('[data-execution="start"]')).toBeDisabled();
  await page.getByTestId('mission-demo').click();
  await page.getByTestId('mission-next').click(); // Browser validation must prevent unconfirmed declarations.
  await expect(page.getByTestId('mission-wizard')).toBeVisible();
  await page.getByTestId('mission-confirm').check(); await page.getByTestId('mission-next').click();
  await expect(page.getByTestId('mission-readable-summary')).toContainText('Awaiting supervisor approval');
  await expect(page.getByTestId('mission-review-summary')).toBeHidden();
  await approve(page,credentials.token);
  await page.getByTestId('mission-execution-variant').selectOption(variant);
  await page.getByTestId('mission-review-token').fill(credentials.token);
  const act = async (action,text) => {
    await page.locator(`[data-execution="${action}"]`).click();
    await expect(page.getByTestId('mission-execution-readable')).toContainText(text);
  };
  await act('start','waiting for the simulated robot'); await expect(page.locator('[data-execution="start"]')).toBeDisabled();
  await act('step','Mission accepted'); await act('step','Inspection underway');
  if (variant === 'obstacle') {
    await act('step','Simulated obstacle reported'); await expect(page.locator('[data-execution="step"]')).toBeDisabled();
    await act('resume','Inspection'); await act('step','Inspection underway');
  }
  await act('step','Run finished');
  await expect(page.locator('[data-execution="step"]')).toBeDisabled();
  if (['ordinary','obstacle'].includes(variant)) {
    await expect(page.getByTestId('mission-execution-readable')).toContainText('R-204 fixture marker A');
  } else {
    await expect(page.getByTestId('mission-execution-readable')).toContainText('no finding reported');
    await expect(page.getByTestId('mission-execution-readable')).not.toContainText('Reported location');
  }
  await act('handoff','Mission closed'); await expect(page.locator('[data-execution="handoff"]')).toBeDisabled();
  await expect(page.getByTestId('mission-execution-timeline')).toContainText('Result acknowledged');
  await page.reload(); await page.locator('#open_diagnostics').click(); await connect(page,credentials.id);
  await expect(page.getByTestId('mission-execution-readable')).toContainText('Mission closed');
  await expect(page.getByTestId('mission-execution-timeline').locator('li')).toHaveCount(variant === 'obstacle' ? 8 : 5);
  await page.locator('#mission_review_panel').screenshot({path:info.outputPath(`guided-${variant}.png`)});
  if (variant === 'ordinary') {
    const created = page.waitForResponse(r => r.url().endsWith('/demo/agents') && r.request().method() === 'POST');
    await page.getByTestId('mission-new').click(); const next = await (await created).json();
    expect(next.id).not.toBe(credentials.id);
    await expect(page.getByTestId('mission-demo')).toBeEnabled();
    await expect(page.getByTestId('mission-readable-summary')).toContainText('Create a mission');
    const prior = await request.get(`/demo/agents/${credentials.id}/mission-execution`,{headers:{'X-Prometheus-Access-Code':credentials.code}});
    expect((await prior.json()).phase).toBe('closed');
  }
});

test('Guided custom answers, stale form protection and two-window refresh', async ({page,request,context}) => {
  const credentials = await setup(page,request);
  const supervisor = await context.newPage();
  await supervisor.goto('/valerian/');
  // A separate tab has its own session; explicitly submit its access code if needed.
  if (await supervisor.getByTestId('access-code-input').isVisible()) {
    await supervisor.getByTestId('access-code-input').fill(credentials.code); await supervisor.getByTestId('submit-access-code').click();
  }
  await supervisor.locator('#open_diagnostics').click(); await connect(supervisor,credentials.id);
  await page.getByTestId('mission-create').click();
  const answers = ['missing_person_search','Locate training mannequin','Practice room B','indoor_rubble','dog robot','medium',
    'Marked training perimeter','Training only; uneven floor','Stop on hazards or lost link','unknown','unknown','unknown','unknown','unknown','unknown'];
  for (let index = 0; index < answers.length; index++) {
    const control = page.getByTestId('mission-answer');
    if (await control.evaluate(el => el.tagName === 'SELECT')) await control.selectOption(answers[index]); else await control.fill(answers[index]);
    await page.getByTestId('mission-next').click();
  }
  await page.getByTestId('mission-confirm').check(); await page.getByTestId('mission-next').click();
  await expect(page.getByTestId('mission-readable-summary')).toContainText('Practice room B');
  await expect(page.getByTestId('mission-readable-summary')).toContainText('dog robot');
  await expect(supervisor.getByTestId('mission-readable-summary')).toContainText('Practice room B');
  await expect(page.locator('[data-decision="approve"]')).toBeDisabled();
  await expect(page.locator('[data-execution="start"]')).toBeDisabled();
  await page.getByTestId('mission-demo').click();
  await supervisor.getByTestId('mission-demo').click(); await supervisor.getByTestId('mission-confirm').check(); await supervisor.getByTestId('mission-next').click();
  await expect(supervisor.getByTestId('mission-readable-summary')).toContainText('Awaiting supervisor approval');
  await page.getByTestId('mission-confirm').check(); await page.getByTestId('mission-next').click();
  await expect(page.getByTestId('mission-config-status')).toContainText('changed in another window');
  await expect(page.getByTestId('mission-readable-summary')).toContainText('R-204');
  await supervisor.close();
});
