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
    await page.goto(`/valerian/?agentId=${id}`);
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
