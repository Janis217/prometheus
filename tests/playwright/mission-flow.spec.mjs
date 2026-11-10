import {test,expect} from './fixtures/offline-ui-assets.mjs';
import {readFile} from 'node:fs/promises';
import {createRoom,place} from '../../src/main/resources/public/valerian/room-simulation.js';
import {scenarioDocument} from '../../src/main/resources/public/valerian/room-artifacts.js';

const answers=['fire_hotspot_inspection','Find printed fire indicator','Training room','indoor_flat','ground robot','low',
  'Room interior','Printed pictures only','Stop on hazards','safe','confirmed','confirmed','confirmed','confirmed','confirmed'];
async function answerQuestions(page){
  for(const answer of answers){
    const control=page.getByTestId('mission-answer');
    if(await control.evaluate(el=>el.tagName==='SELECT'))await control.selectOption(answer);else await control.fill(answer);
    await page.getByTestId('mission-next').click();
  }
}
test('home presents only two choices and fits a small screen',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'What would you like to do?'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Start a mission',exact:false})).toBeVisible();
  await expect(page.getByRole('link',{name:'Create simulation room',exact:false})).toHaveAttribute('target','_blank');
  await expect(page.locator('.choices').locator('button,a')).toHaveCount(2);
  await expect(page.locator('#setup')).toBeHidden();
  await page.screenshot({path:'target/mission-home-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'target/mission-home-mobile.png',fullPage:true});
});

test('old cockpit bookmarks return to the two-choice home without an embedded builder',async({page})=>{
  await page.goto('/valerian/cockpit.html?agentId=00000000-0000-0000-0000-000000000001');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('.choices').locator('button,a')).toHaveCount(2);
  await expect(page.locator('[data-room="shape"]')).toHaveCount(0);
  await expect(page.locator('[data-room="start"]')).toHaveCount(0);
  await expect(page.locator('#create-room')).toHaveAttribute('target','_blank');
  await page.goto('/valerian/index.html?agentId=00000000-0000-0000-0000-000000000001');
  await expect(page.locator('#home')).toBeVisible();await expect(page.locator('#setup')).toBeHidden();
});

test('cached cockpit HTML at the old default address migrates to the clean home',async({page})=>{
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/valerian/index.html',async route=>route.fulfill({contentType:'text/html',body:await readFile('src/main/resources/public/valerian/developer-cockpit.html','utf8')}));
  await page.goto('/valerian/index.html');
  await expect(page).toHaveURL(/index\.html\?view=missions/);
  await expect(page.locator('#home')).toBeVisible();await expect(page.locator('[data-room="shape"]')).toHaveCount(0);
});

test('two-tab room creation, guided mission setup and explicit simulation Start',async({page,request})=>{
  const code=process.env.PROMETHEUS_ROOM_ACCESS_CODE;test.skip(!code,'Requires the local room access scope.');
  let id;
  try{
    await page.goto('/');
    const roomPopup=page.waitForEvent('popup');await page.locator('#create-room').click();const builder=await roomPopup;
    await expect(builder.locator('#room-editor')).toBeVisible();
    await builder.locator('[data-room="tool"]').selectOption('fire_picture');await builder.locator('[data-x="5"][data-y="0"]').click();
    await builder.locator('#room-name').fill('Clean flow room');await builder.locator('#save-room').click();
    await expect(builder.locator('#library-status')).toContainText('Saved Clean flow room');
    const roomId=await builder.locator('#saved-rooms').inputValue();
    await expect(page.locator('#home')).toBeVisible();await page.locator('#start-mission').click();
    await page.locator('#access-code').fill(code);await page.getByRole('button',{name:'Continue',exact:true}).click();
    await expect(page.getByTestId('mission-answer')).toBeVisible();id=new URL(page.url()).searchParams.get('agentId');expect(id).toBeTruthy();
    await expect(page).toHaveURL(/cockpit\.html\?setup=mission/);
    await expect(page.getByTestId('start-camera')).toHaveCount(1);
    await expect(page.locator('[data-column-panel="sensing"]')).toBeVisible();
    await expect(page.getByTestId('camera-status')).toContainText('Idle');
    await expect(page.getByTestId('mission-demo')).toBeHidden();
    await answerQuestions(page);
    await page.getByTestId('mission-name').fill('Clean flow mission');await page.getByTestId('mission-saved-room').selectOption(`${roomId}:1`);
    await page.getByTestId('mission-confirm').check();
    await page.screenshot({path:'target/mission-setup-desktop.png',fullPage:true});
    await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:'target/mission-setup-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
    // A blocked popup must keep the form and saved task untouched for a retry.
    await page.evaluate(()=>{window.originalOpen=window.open;window.open=()=>null;});
    await page.getByTestId('mission-next').click();await expect(page.getByTestId('mission-config-status')).toContainText('Allow a new tab');
    const headers={'X-Prometheus-Access-Code':code};
    const before=await (await request.get(`/demo/agents/${id}/mission-review`,{headers})).json();expect(before.savedMission).toBeFalsy();
    await page.evaluate(()=>{window.open=window.originalOpen;});
    await page.route('**/demo/agents/*/mission-configuration',route=>route.fulfill({status:503,json:{}}),{times:1});
    const rejectedPopup=page.waitForEvent('popup');await page.getByTestId('mission-next').click();const rejected=await rejectedPopup;
    await expect.poll(()=>rejected.isClosed()).toBe(true);await expect(page.getByTestId('mission-config-status')).toContainText('could not be saved (503)');
    const rejectedReview=await (await request.get(`/demo/agents/${id}/mission-review`,{headers})).json();expect(rejectedReview.savedMission).toBeFalsy();
    await expect(page.getByTestId('mission-wizard')).toBeVisible();
    const simulationPopup=page.waitForEvent('popup');await page.getByRole('button',{name:'Run simulation',exact:true}).click();const player=await simulationPopup;
    await expect(player.locator('#player-title')).toHaveText('Clean flow mission');
    expect(player.url()).not.toContain(code);expect(await player.evaluate(()=>window.opener)).toBeNull();
    await expect(player.locator('#player-phase')).toHaveText('Ready');await expect(player.locator('#timeline li')).toHaveCount(0);
    await expect(player.locator('#scene [data-x="0"][data-y="0"]')).toHaveText('→');
    await expect(page.getByTestId('cockpit-shell')).toBeVisible();await expect(page.getByTestId('mission-run-external')).toBeVisible();await expect(page.locator('[data-room="start"]')).toHaveCount(0);
    await player.clock.install();await player.locator('#start').click();await player.clock.runFor(950);await player.locator('#pause').click();
    await expect(player.locator('#player-phase')).toHaveText('Paused');const count=await player.locator('#timeline li').count();
    await player.clock.runFor(2000);await expect(player.locator('#timeline li')).toHaveCount(count);
    await player.locator('#pause').click();await player.clock.runFor(10000);await expect(player.locator('#player-phase')).toHaveText('Completed');
    await expect(player.locator('#timeline')).toContainText('take_photo(');await expect(player.locator('#timeline')).toContainText('report_findings(');
    await expect(player.locator('#timeline')).toContainText('move(direction="east", distanceMeters=1');
    await expect(player.locator('#timeline')).toContainText('recipient="supervisor"');
    await expect(player.locator('.function-outcome').first()).toContainText('succeeded [OK]');
    const downloaded=player.waitForEvent('download');await player.locator('#export-run').click();
    const report=JSON.parse(await readFile(await (await downloaded).path(),'utf8'));
    expect(report.specification.savedMission.id).toBe(id);expect(report.summary.photos).toHaveLength(1);
    expect(report.actionProtocolVersion).toBe(1);expect(report.events.every(event=>event.call.id===event.response.requestId)).toBe(true);
    expect(report.events.find(event=>event.action==='report_findings').call.parameters.findings).toHaveLength(1);
    await player.screenshot({path:'target/mission-player-desktop.png',fullPage:true});
    await player.setViewportSize({width:390,height:844});expect(await player.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await player.screenshot({path:'target/mission-player-mobile.png',fullPage:true});
    await player.reload();await expect(player.locator('#player-phase')).toHaveText('Ready');await expect(player.locator('#timeline li')).toHaveCount(0);
    // Changing the saved mission invalidates an already-open simulation tab.
    await page.getByTestId('mission-edit').click();await answerQuestions(page);
    await page.getByText('Simulation settings',{exact:true}).click();await page.locator('[data-option="evidence"]').selectOption('observation');
    await page.locator('[data-option="stepLimit"]').fill('1');await page.getByTestId('mission-confirm').check();
    const nextPopup=page.waitForEvent('popup');await page.getByTestId('mission-next').click();const next=await nextPopup;
    await expect(next.locator('#player-title')).toHaveText('Clean flow mission');
    await player.clock.runFor(3500);await expect(player.locator('#player-status')).toContainText('Mission changed');await expect(player.locator('#start')).toBeDisabled();
    await next.locator('#start').click();await next.locator('#stop').click();await expect(next.locator('#player-phase')).toHaveText('Stopped');
    await builder.close();await player.close();await next.close();
  }finally{if(id)expect((await request.delete(`/demo/agents/${id}`,{headers:{'X-Prometheus-Access-Code':code}})).ok()).toBe(true);}
});

test('player displays function arguments and typed blocked results from a locked-door simulation',async({page})=>{
  const room=createRoom();place(room,'door',1,0,{locked:true});place(room,'chair',0,1);place(room,'fire_picture',5,0);
  const review={mission:JSON.stringify({missionType:'fire_hotspot_inspection',objective:'Find printed fire indicator',environment:'indoor_flat',revision:1,missingInformation:[],approvalState:'awaiting_supervisor_approval'}),
    savedMission:{name:'Door function check',configuredRevision:1,room:{id:'00000000-0000-0000-0000-000000000001',name:'Locked door room',revision:1,configuration:JSON.stringify(scenarioDocument(room))}}};
  await page.route('**/demo/agents/*/mission-review',route=>route.fulfill({json:review}));
  await page.goto('/');await page.evaluate(()=>sessionStorage.setItem('prometheus.valerian.accessCode','test-access'));
  await page.goto('/valerian/simulation.html?mission=00000000-0000-0000-0000-000000000001');
  await expect(page.locator('#player-phase')).toHaveText('Ready');await page.clock.install();
  await page.locator('#start').click();await page.clock.runFor(10000);
  await expect(page.locator('#player-phase')).toHaveText('Blocked');
  const call=page.locator('#timeline li').filter({hasText:'open_door('});
  await expect(call.locator('.function-call')).toContainText('doorId="object-1"');
  await expect(call.locator('.function-call')).toContainText('force=false');
  await expect(call.locator('.function-outcome')).toHaveText('→ blocked [DOOR_LOCKED]');
  await call.getByText('Result',{exact:true}).click();await expect(call.locator('pre')).toContainText('"open": false');
  await expect(page.locator('#timeline')).toContainText('stop(reason="locked_doors")');
  await page.screenshot({path:'target/function-calls-locked-door.png',fullPage:true});
});

test('simulation refuses missing mission data or invalid access without a fallback room',async({page})=>{
  await page.goto('/valerian/simulation.html');await expect(page.locator('#player-status')).toContainText('Open a saved mission');await expect(page.locator('#player')).toBeHidden();
  await page.evaluate(()=>sessionStorage.setItem('prometheus.valerian.accessCode','INVALID'));
  await page.goto('/valerian/simulation.html?mission=00000000-0000-0000-0000-000000000001');
  await expect(page.locator('#player-access')).toBeVisible();await expect(page.locator('#player-status')).toContainText('valid access code');
  await expect(page.locator('#scene .cell')).toHaveCount(0);
  let review={mission:JSON.stringify({revision:1}),savedMission:null};
  await page.route('**/demo/agents/*/mission-review',route=>route.fulfill({json:review}));
  await page.reload();await expect(page.locator('#player-status')).toContainText('no saved room');
  review={mission:JSON.stringify({revision:1}),savedMission:{configuredRevision:1,name:'Invalid room mission',room:{configuration:'{}'}}};
  await page.reload();await expect(page.locator('#player-status')).toContainText('version 1 room');
  await expect(page.locator('#player')).toBeHidden();await expect(page.locator('#scene .cell')).toHaveCount(0);
});
