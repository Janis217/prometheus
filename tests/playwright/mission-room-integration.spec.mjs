import {test,expect} from './fixtures/offline-ui-assets.mjs';

test('named missions preserve selected room snapshots across reload, library edits, switching and explicit updates',async({page,request})=>{
  const code=process.env.PROMETHEUS_ROOM_ACCESS_CODE;
  test.skip(!code,'Set PROMETHEUS_ROOM_ACCESS_CODE for a running configured local server.');
  const headers={'X-Prometheus-Access-Code':code},owned=[];
  const review=async id=>{const response=await request.get(`/demo/agents/${id}/mission-review`,{headers});expect(response.ok()).toBe(true);return response.json();};
  for(let i=0;i<2;i++){
    const response=await request.post('/demo/agents',{headers,data:{agentDefinitionKey:'core.disaster_mission_configuration'}});
    expect(response.status()).toBe(201);owned.push((await response.json()).id);
  }
  async function connect(id){
    const firstLogin=!(await page.evaluate(()=>sessionStorage.getItem('prometheus.valerian.accessCode')));
    await page.goto(`/valerian/developer-cockpit.html?agentId=${id}`);
    if(firstLogin){
      await page.getByTestId('access-code-input').fill(code);await page.getByTestId('submit-access-code').click();
    }
    await expect(page.getByTestId('agent-connection-state')).toContainText(`Connected to ${id}`);
    await expect(page.getByTestId('mission-demo')).toBeEnabled();
  }
  try{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/valerian/rooms.html');
    await page.locator('[data-room="shape"]').selectOption('l_shaped');
    await page.locator('[data-room="tool"]').selectOption('fire_picture');await page.locator('[data-x="5"][data-y="0"]').click();
    await page.locator('[data-room="tool"]').selectOption('chair');
    for(let y=1;y<=6;y++)for(let x=1;x<=3;x++)await page.locator(`[data-x="${x}"][data-y="${y}"]`).click();
    await page.locator('#room-name').fill('VT08 training room');await page.locator('#save-room').click();
    await expect(page.locator('#library-status')).toContainText('Saved VT08 training room');
    const roomId=await page.locator('#saved-rooms').inputValue();
    await connect(owned[0]);
    await page.getByTestId('mission-demo').click();
    await page.getByTestId('mission-saved-room').selectOption(`${roomId}:1`);
    await page.getByTestId('mission-name').fill('VT08 Mission A');
    await expect(page.getByTestId('mission-room-preview')).toContainText('VT08 training room');
    await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
    const first=await review(owned[0]);
    expect(first.savedMission.name).toBe('VT08 Mission A');expect(first.savedMission.room.revision).toBe(1);
    await expect(page.getByTestId('task-specification-json')).toContainText('saved_definition');
    await expect(page.locator('[data-execution="start"]')).toBeDisabled();
    const task=JSON.parse(first.mission);expect(task.ready).toBe(false);
    expect(JSON.parse(first.savedMission.room.configuration).room.shape).toBe('l_shaped');
    expect(JSON.parse(first.savedMission.room.configuration).room.objects[0].type).toBe('fire_picture');
    expect(first.savedMission.room.configuration.length).toBeGreaterThan(800);
    const entries=await (await request.get(`/demo/agents/${owned[0]}/storage`,{headers})).json();
    expect(entries.filter(entry=>entry.key.startsWith('saved_mission.room.')).length).toBeGreaterThan(1);
    expect(entries.every(entry=>entry.value.length<=2048)).toBe(true);
    expect((await request.get(`/demo/agents/${owned[0]}/mission-execution`,{headers})).status()).toBe(404);

    // Save another mission using the same room. Mission data stays independent.
    await connect(owned[1]);await page.getByTestId('mission-create').click();
    for(const answer of ['fire_hotspot_inspection','Find printed fire indicator','Training B','indoor_flat','ground robot','high',
      'Training B interior','printed image; no actual fire','stop on hazards','safe','confirmed','confirmed','confirmed','confirmed','confirmed']){
      const control=page.getByTestId('mission-answer');
      if(await control.evaluate(el=>el.tagName==='SELECT'))await control.selectOption(answer);else await control.fill(answer);
      await page.getByTestId('mission-next').click();
    }
    await page.getByTestId('mission-saved-room').selectOption(`${roomId}:1`);await page.getByTestId('mission-name').fill('VT08 Mission B');
    await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
    const second=await review(owned[1]);expect(second.savedMission.name).toBe('VT08 Mission B');
    expect(JSON.parse(second.mission).location).toBe('Training B');expect(JSON.parse(second.mission).priority).toBe('high');
    expect(JSON.parse((await review(owned[0])).mission).location).toBe('R-204');

    // Later library edits do not affect either saved mission.
    await page.goto('/valerian/rooms.html');await page.locator('#saved-rooms').selectOption(roomId);await page.locator('#open-room').click();
    await page.locator('[data-room="smoke"]').check();await page.locator('#save-room').click();
    await expect(page.locator('#library-status')).toContainText('revision 2');
    await connect(owned[1]);await page.reload();
    await expect(page.getByTestId('saved-mission-summary')).toContainText('VT08 Mission B');
    await page.getByTestId('saved-missions-refresh').click();
    await expect(page.getByTestId('saved-missions').locator(`option[value="${owned[0]}"]`)).toHaveCount(1);
    await page.getByTestId('saved-missions').selectOption(owned[0]);await page.getByTestId('saved-missions-open').click();
    await expect(page.getByTestId('saved-mission-summary')).toContainText('VT08 Mission A');
    await expect(page.getByTestId('saved-mission-room-preview')).toContainText('smoke off');
    expect((await review(owned[0])).savedMission).toEqual(first.savedMission);

    // Saved mission playback stays in its own tab, including the full cockpit.
    const playbackPopup=page.waitForEvent('popup');await page.getByTestId('mission-run-external').click();const playback=await playbackPopup;
    await expect(playback.locator('#start')).toBeEnabled();await playback.locator('#start').click();
    await expect(playback.locator('#player-phase')).toHaveText('Completed',{timeout:20000});
    await expect(playback.locator('#timeline')).toContainText('report_findings(');
    expect((await review(owned[0])).savedMission).toEqual(first.savedMission);
    await playback.locator('#start').click();await playback.locator('#pause').click();
    await expect(playback.locator('#pose')).toContainText('(0, 0)');await playback.locator('#stop').click();await playback.close();

    // A newer room version is applied only by choosing and saving it explicitly.
    await page.getByTestId('mission-demo').click();
    await expect(page.getByTestId('mission-saved-room')).toHaveValue(`${roomId}:1`);
    await page.getByTestId('mission-confirm').check();
    await page.getByTestId('mission-saved-room').selectOption(`${roomId}:2`);
    await expect(page.getByTestId('mission-confirm')).not.toBeChecked();
    await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
    const updated=await review(owned[0]);expect(updated.savedMission.room.revision).toBe(2);
    expect(JSON.parse(updated.mission).ready).toBe(false);
    expect((await review(owned[1])).savedMission.room).toEqual(first.savedMission.room);

    // Preview/restoration works even after local library data has been removed.
    await page.evaluate(()=>localStorage.removeItem('prometheus.room-library.v1'));
    await page.reload();await expect(page.getByTestId('saved-mission-room-preview')).toContainText('smoke on');
    const restoredPopup=page.waitForEvent('popup');await page.getByTestId('mission-run-external').click();const restored=await restoredPopup;
    await expect(restored.locator('#start')).toBeEnabled();await restored.locator('#start').click();await restored.locator('#pause').click();
    await restored.locator('#stop').click();const exported=restored.waitForEvent('download');await restored.locator('#export-run').click();
    const {readFile}=await import('node:fs/promises');const evidence=JSON.parse(await readFile(await (await exported).path(),'utf8'));
    expect(evidence.specification.room.savedRoomRevision).toBe(2);await restored.close();
    await page.getByTestId('mission-demo').click();
    await expect(page.getByTestId('mission-saved-room')).toHaveValue(`${roomId}:2`);
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByTestId('mission-room-preview').screenshot({path:'target/saved-mission-room-picker-mobile.png'});
    await page.setViewportSize({width:1440,height:1000});
    await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
    const resaved=await review(owned[0]);expect(resaved.savedMission.room).toEqual(updated.savedMission.room);

    // Stale/invalid requests do not change either task or snapshot; invalid scope cannot read them.
    const data={expectedRevision:0,fields:Object.fromEntries(['missionType','objective','priority','location','environment','risks','operatingConditions','searchBoundary','safetyAssessment'].map(key=>[key,task[key]])),
      robot:'ground robot',platformEvidence:task.platformSafety.declarations,savedMission:first.savedMission};
    expect((await request.put(`/demo/agents/${owned[0]}/mission-configuration`,{headers,data})).status()).toBe(409);
    data.expectedRevision=JSON.parse(resaved.mission).revision;data.savedMission={...first.savedMission,room:{...first.savedMission.room,configuration:'{}'}};
    expect((await request.put(`/demo/agents/${owned[0]}/mission-configuration`,{headers,data})).status()).toBe(400);
    expect(await review(owned[0])).toEqual(resaved);
    expect((await request.get(`/demo/agents/${owned[0]}/mission-review`,{headers:{'X-Prometheus-Access-Code':'BAD00'}})).status()).toBe(401);
    expect(errors).toEqual([]);
    await page.screenshot({path:'target/saved-mission-room.png',fullPage:true});
  }finally{
    for(const id of owned)expect((await request.delete(`/demo/agents/${id}`,{headers})).ok()).toBe(true);
  }
});

test('saved simulation controls survive reload and produce paired first/all/limited results',async({page,request})=>{
  const code=process.env.PROMETHEUS_ROOM_ACCESS_CODE;
  test.skip(!code,'Set PROMETHEUS_ROOM_ACCESS_CODE for a running configured local server.');
  const headers={'X-Prometheus-Access-Code':code};
  const created=await request.post('/demo/agents',{headers,data:{agentDefinitionKey:'core.disaster_mission_configuration'}});
  expect(created.status()).toBe(201);const id=(await created.json()).id;
  const control=name=>page.locator(`[data-option="${name}"]`),room=name=>page.locator(`[data-room="${name}"]`);
  const review=async()=>await (await request.get(`/demo/agents/${id}/mission-review`,{headers})).json();
  async function save(options){
    await page.getByTestId('mission-demo').click();
    if(options)for(const [key,value] of Object.entries(options)){
      if(key==='stepLimit')await control(key).fill(String(value));else await control(key).selectOption(value);
    }
    await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
  }
  async function runReport(){
    const popup=page.waitForEvent('popup');await page.getByTestId('mission-run-external').click();const player=await popup;
    await expect(player.locator('#start')).toBeEnabled();await player.clock.install();await player.locator('#start').click();
    await player.clock.runFor(150000);await expect(player.locator('#player-phase')).not.toHaveText('Running');
    const download=player.waitForEvent('download');await player.locator('#export-run').click();
    const {readFile}=await import('node:fs/promises');const report=JSON.parse(await readFile(await (await download).path(),'utf8'));
    await player.close();return report;
  }
  try{
    await page.goto('/valerian/rooms.html');
    await room('tool').selectOption('fire_picture');
    for(const [x,y] of [[1,0],[5,5]])await page.locator(`[data-x="${x}"][data-y="${y}"]`).click();
    await page.locator('#room-name').fill('VT10 paired room');await page.locator('#save-room').click();
    await expect(page.locator('#library-status')).toContainText('Saved VT10 paired room');
    const roomId=await page.locator('#saved-rooms').inputValue();
    await page.goto(`/valerian/developer-cockpit.html?agentId=${id}`);await page.getByTestId('access-code-input').fill(code);await page.getByTestId('submit-access-code').click();
    await expect(page.getByTestId('agent-connection-state')).toContainText(`Connected to ${id}`);
    await page.getByTestId('mission-demo').click();await page.getByTestId('mission-saved-room').selectOption(`${roomId}:1`);
    await page.getByTestId('mission-name').fill('VT10 paired mission');
    await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
    await page.clock.install();
    const first=await runReport();expect(first.phase).toBe('completed');expect(first.summary.photos).toHaveLength(1);
    await save({searchGoal:'all',evidence:'observation',doors:'avoid_closed',stepLimit:256});
    await page.reload();await expect(page.getByTestId('saved-mission-summary')).toContainText('VT10 paired mission');
    await page.getByTestId('mission-demo').click();
    await expect(control('searchGoal')).toHaveValue('all');await expect(control('evidence')).toHaveValue('observation');
    await expect(control('doors')).toHaveValue('avoid_closed');await expect(control('stepLimit')).toHaveValue('256');
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    const all=await runReport();expect(all.phase).toBe('completed');expect(all.summary.findings).toHaveLength(2);expect(all.summary.photos).toHaveLength(0);
    expect(all.events.some(event=>event.action==='record_observation')).toBe(true);
    expect(all.initialRoom).toEqual(first.initialRoom);
    await save({searchGoal:'all',evidence:'photo',stepLimit:1});
    const limited=await runReport();expect(limited.phase).toBe('partial');expect(limited.summary.autonomousSteps).toBe(1);expect(limited.summary.photos).toHaveLength(1);
    const current=await review(),task=JSON.parse(current.mission);
    const data={expectedRevision:task.revision,fields:Object.fromEntries(['missionType','objective','priority','location','environment','risks','operatingConditions','searchBoundary','safetyAssessment'].map(key=>[key,task[key]])),robot:'ground robot',platformEvidence:task.platformSafety.declarations,savedMission:current.savedMission};
    for(const invalid of [{stepLimit:1.5},{stepLimit:0},{searchGoal:'any'},{evidence:'thermal'},{doors:'force'},{version:2}]){
      data.savedMission={...current.savedMission,simulationOptions:{...current.savedMission.simulationOptions,...invalid}};
      expect((await request.put(`/demo/agents/${id}/mission-configuration`,{headers,data})).status()).toBe(400);
    }
    expect(await review()).toEqual(current);
  }finally{expect((await request.delete(`/demo/agents/${id}`,{headers})).ok()).toBe(true);}
});

test('cockpit opens room creation only in a separate tab, including tasks without saved rooms',async({page,request})=>{
  const code=process.env.PROMETHEUS_ROOM_ACCESS_CODE;
  test.skip(!code,'Set PROMETHEUS_ROOM_ACCESS_CODE for a running configured local server.');
  const headers={'X-Prometheus-Access-Code':code};
  const created=await request.post('/demo/agents',{headers,data:{agentDefinitionKey:'core.disaster_mission_configuration'}});
  expect(created.status()).toBe(201);const id=(await created.json()).id;
  const builderRequests=[];page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/room-workspace.js'))builderRequests.push(request.url());});
  try{
    await page.goto(`/valerian/developer-cockpit.html?agentId=${id}`);await page.getByTestId('access-code-input').fill(code);await page.getByTestId('submit-access-code').click();
    await expect(page.getByTestId('agent-connection-state')).toContainText(`Connected to ${id}`);
    await expect(page.getByTestId('mission-build-room')).toBeVisible();await expect(page.locator('[data-room]')).toHaveCount(0);
    const popup=page.waitForEvent('popup');await page.getByTestId('mission-build-room').click();const builder=await popup;
    await expect(builder.locator('[data-room="shape"]')).toBeVisible();await expect(page.locator('[data-room]')).toHaveCount(0);await builder.close();
    await page.getByTestId('mission-demo').click();await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
    await expect(page.getByTestId('mission-config-status')).toContainText('Task saved');
    await expect(page.locator('[data-room]')).toHaveCount(0);expect(builderRequests).toEqual([]);
    await page.reload();await expect(page.getByTestId('agent-connection-state')).toContainText(`Connected to ${id}`);
    await expect(page.locator('[data-room]')).toHaveCount(0);expect(builderRequests).toEqual([]);
  }finally{expect((await request.delete(`/demo/agents/${id}`,{headers})).ok()).toBe(true);}
});
