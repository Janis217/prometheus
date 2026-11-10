import {test,expect} from './fixtures/offline-ui-assets.mjs';
import {demoFields,requiredChecks} from '../../src/main/resources/public/valerian/mission-wizard.js';

test('test mode retains approve/revoke/reject and legacy simulation start without a password',async({page,request})=>{
  const code=process.env.PROMETHEUS_ROOM_ACCESS_CODE;
  test.skip(!code||process.env.PROMETHEUS_EXPECT_PASSWORD_DISABLED!=='true','Requires an explicitly configured local password-disabled demo.');
  const headers={'X-Prometheus-Access-Code':code};
  const created=await request.post('/demo/agents',{headers,data:{agentDefinitionKey:'core.disaster_mission_configuration'}});
  expect(created.status()).toBe(201);const agent=await created.json(),path=`/demo/agents/${agent.id}`;
  const read=async()=>{const response=await request.get(path+'/mission-review',{headers});expect(response.ok()).toBe(true);return response.json();};
  const decision=(snapshot)=>({requestId:crypto.randomUUID(),revision:JSON.parse(snapshot.mission).revision,
    reviewVersion:snapshot.reviewVersion,safetyReference:snapshot.safetyReference,decision:'approve'});
  try{
    const initial=await read();expect(initial.supervisorCredentialRequired).toBe(false);
    expect((await request.post(path+'/mission-review',{headers,data:decision(initial)})).status()).toBe(409);
    const saved=await request.put(path+'/mission-configuration',{headers,data:{expectedRevision:0,fields:demoFields,
      platformEvidence:Object.fromEntries(requiredChecks('indoor_flat').map(key=>[key,'confirmed'])),robot:'ground robot'}});
    expect(saved.ok()).toBe(true);
    expect((await request.post(path+'/mission-review',{headers,data:decision(initial)})).status()).toBe(409);
    expect((await request.post(path+'/mission-review',{headers:{'X-Prometheus-Access-Code':'INVALID-TEST'},data:decision(await read())})).status()).toBe(401);
    await page.goto('/valerian/developer-cockpit.html');await page.getByTestId('access-code-input').fill(code);await page.getByTestId('submit-access-code').click();
    await page.locator('#open_diagnostics').click();await page.getByTestId('agent-type-select').selectOption('core.disaster_mission_configuration');
    await page.getByTestId('agent-select').selectOption(agent.id);await page.getByTestId('connect-agent').click();
    await expect(page.getByTestId('agent-connection-state')).toContainText(`Connected to ${agent.id}`);
    await expect(page.locator('#diagnostics_drawer')).not.toHaveClass(/showing/);
    await page.locator('#diagnostics_drawer').getByRole('button',{name:'Close',exact:true}).click();
    await page.getByText('Mission supervisor review',{exact:true}).click();
    await expect(page.getByTestId('mission-review-token')).toBeHidden();
    await expect(page.getByTestId('mission-review-password-mode')).toBeVisible();
    for(const action of ['approve','revoke','reject','approve']){
      await page.locator(`[data-decision="${action}"]`).click();
      await expect(page.getByTestId('mission-review-status')).toContainText(`Recorded: ${action}`);
      expect(JSON.parse((await read()).mission).ready).toBe(action==='approve');
    }
    const storage=await request.get(path+'/storage',{headers});expect(storage.ok()).toBe(true);
    const reviews=(await storage.json()).filter(e=>e.key.startsWith('disaster_mission_review.'));
    expect(reviews).toHaveLength(4);
    for(const record of reviews)expect(JSON.parse(record.value).authenticationMode).toBe('password_disabled_for_testing');
    await page.locator('[data-execution="start"]').click();
    await expect(page.getByTestId('mission-execution-readable')).toContainText('Simulation started');
  }finally{expect((await request.delete(path,{headers})).ok()).toBe(true);}
});
