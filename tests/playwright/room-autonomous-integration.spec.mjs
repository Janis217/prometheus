import {test,expect} from './fixtures/offline-ui-assets.mjs';
import {readFile} from 'node:fs/promises';

// Opt-in acceptance against a running, configured local demo. Owns only its newly created agent.
test('form-defined task persists through scoped backend and runs autonomously without an inference provider',async({page,request})=>{
  const code=process.env.PROMETHEUS_ROOM_ACCESS_CODE;
  test.skip(!code,'Set PROMETHEUS_ROOM_ACCESS_CODE for a running local demo.');
  const headers={'X-Prometheus-Access-Code':code};
  const created=await request.post('/demo/agents',{headers,data:{agentDefinitionKey:'core.disaster_mission_configuration'}});
  expect(created.status()).toBe(201);const agent=await created.json();
  try{
    await page.goto('/valerian/');
    await page.getByTestId('access-code-input').fill(code);await page.getByTestId('submit-access-code').click();
    await page.locator('#open_diagnostics').click();
    await page.getByTestId('agent-type-select').selectOption('core.disaster_mission_configuration');
    await page.getByTestId('agent-select').selectOption(agent.id);await page.getByTestId('connect-agent').click();
    await expect(page.getByTestId('agent-connection-state')).toContainText(`Connected to ${agent.id}`);
    await expect(page.locator('#diagnostics_drawer')).not.toHaveClass(/showing/);
    await page.locator('#diagnostics_drawer').getByRole('button',{name:'Close',exact:true}).click();
    await expect(page.getByTestId('mission-create')).toBeEnabled();
    await page.getByTestId('mission-create').click();
    const answers=['fire_hotspot_inspection','Find printed fire indicator','Training room A','indoor_flat','ground robot',
      'low','Training room A interior','printed image; no actual fire','stop on hazards or lost link','safe',
      'confirmed','confirmed','confirmed','confirmed','confirmed'];
    for(const answer of answers){
      const control=page.getByTestId('mission-answer');
      if(await control.evaluate(el=>el.tagName==='SELECT'))await control.selectOption(answer);else await control.fill(answer);
      await page.getByTestId('mission-next').click();
    }
    await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
    const stored=await request.get(`/demo/agents/${agent.id}/storage`,{headers});expect(stored.ok()).toBe(true);
    const mission=JSON.parse((await stored.json()).find(e=>e.key==='disaster_mission').value);
    expect(mission.location).toBe('Training room A');expect(mission.missingInformation).toEqual([]);
    expect(mission.ready).toBe(false); // Local simulation grants no supervisor approval.
    const room=name=>page.locator(`[data-room="${name}"]`);
    await room('tool').selectOption('door');await page.locator('[data-x="1"][data-y="0"]').click();
    await room('tool').selectOption('fire_picture');await page.locator('[data-x="5"][data-y="0"]').click();
    await room('save').click();await expect(room('status')).toContainText('Room saved');
    await room('generate').click();await room('start').click();
    await expect(room('pose')).toContainText('Phase: completed');
    await expect(room('timeline')).toContainText('open_door: success');
    await expect(room('timeline')).toContainText('report_findings: success');
    const downloaded=page.waitForEvent('download');await room('report').click();
    const report=JSON.parse(await readFile(await (await downloaded).path(),'utf8'));
    expect(report.specification.room.location).toBe('Training room A');
    expect(report.missionRevision).toBe(mission.revision);expect(report.phase).toBe('completed');
    expect(report.initialRoom.objects).toHaveLength(2);expect(report.events.at(-1).action).toBe('report_findings');
    await page.screenshot({path:'target/room-autonomous-integrated.png',fullPage:true});
  }finally{
    const removed=await request.delete(`/demo/agents/${agent.id}`,{headers});expect(removed.ok()).toBe(true);
  }
});
