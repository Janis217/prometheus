import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const mission={missionType:'fire_hotspot_inspection',objective:'Find printed fire indicator',environment:'indoor_flat',
  revision:1,location:'R-204',searchBoundary:'R-204 interior only',missingInformation:[],approvalState:'awaiting_supervisor_approval'};

test.beforeEach(async({page})=>{
  await page.route('**/valerian/*.js',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop();
    const allowed=['room-workspace.js','room-simulation.js','room-world.js','simulation-actions.js','simulation-action-executor.js','room-artifacts.js','task-specification.js','mission-review.js','mission-wizard.js','mission-presentation.js','mission-rooms.js','room-library.js'];
    if(!allowed.includes(name))return route.abort();
    await route.fulfill({contentType:'text/javascript',body:await readFile(`src/main/resources/public/valerian/${name}`,'utf8')});
  });
  await page.route('**/__room_test',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><main id="root"></main></body></html>'}));
  await page.goto('/__room_test');
});
async function mount(page){
  await page.evaluate(async mission=>{
    window.mission=mission;
    const {mountRoomWorkspace}=await import('/valerian/room-workspace.js');
    window.scope={agentId:'room-test-agent'};
    window.workspace=mountRoomWorkspace(document.querySelector('#root'),()=>window.mission,{getScope:()=>window.scope});
  },mission);
}
const room=(page,name)=>page.locator(`[data-room="${name}"]`);
const slot=(page,x,y)=>page.locator(`[data-x="${x}"][data-y="${y}"]`);

test('builder, locked door, smoke and mission invalidation use the visible workflow',async({page})=>{
  await mount(page);
  await room(page,'shape').selectOption('l_shaped');
  await expect(slot(page,6,6)).toBeHidden();
  await room(page,'shape').selectOption('rectangle');
  await room(page,'shape').selectOption('square');
  await room(page,'tool').selectOption('door');await room(page,'locked').check();
  await slot(page,1,0).click();
  await room(page,'tool').selectOption('fire_picture');await slot(page,5,0).click();
  await room(page,'smoke').check();
  await room(page,'generate').click();await room(page,'start').click();
  await room(page,'pause').click();
  await expect(room(page,'pose')).toContainText('(0, 0)');
  await room(page,'target').selectOption({label:'Door (1, 0)'});
  await page.locator('[data-room-action="open_door"]').click();
  await expect(room(page,'timeline')).toContainText('blocked [DOOR_LOCKED]');
  await expect(room(page,'target').locator('option')).toHaveCount(2);
  await page.evaluate(()=>{window.mission.revision=2;window.workspace.refresh();});
  await expect(room(page,'status')).toContainText('Task revision changed');
  await expect(room(page,'step')).toBeDisabled();
  await page.evaluate(()=>window.workspace.clear());
  await expect(room(page,'timeline').locator('li')).toHaveCount(0);
});

test('start executes autonomously without further action clicks and reports matching evidence',async({page})=>{
  await mount(page);await room(page,'tool').selectOption('fire_picture');await slot(page,5,0).click();
  await room(page,'generate').click();await room(page,'start').click();
  await expect(room(page,'pose')).toContainText('Phase: completed');
  await expect(room(page,'timeline')).toContainText('take_photo(');
  await expect(room(page,'timeline')).toContainText('report_findings(');
  await expect(slot(page,4,0)).toHaveText('→');
  await page.screenshot({path:'target/room-simulation-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await expect(room(page,'grid')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'target/room-simulation-mobile.png',fullPage:true});
});

for(const separateSimulation of [false,true])test(`mission workspace never mounts a room builder (separateSimulation=${separateSimulation})`,async({page})=>{
  const builderRequests=[];page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/room-workspace.js'))builderRequests.push(request.url());});
  await page.evaluate(async({mission,separateSimulation})=>{
    window.scope={agentId:'test-agent',accessCode:'test'};
    window.fetch=async url=>new Response(JSON.stringify(String(url).endsWith('/mission-review')
      ?{mission:JSON.stringify(mission),reviewVersion:0,safetyReference:'fixture'}:null),
      {status:String(url).endsWith('/mission-execution')?404:200,headers:{'Content-Type':'application/json'}});
    const {mountMissionReview}=await import('/valerian/mission-review.js');
    window.review=mountMissionReview(document.querySelector('#root'),()=>window.scope,{separateSimulation});
    await window.review.refresh();
  },{mission,separateSimulation});
  await expect(page.getByTestId('task-specification-readable')).toContainText('Required sensing');
  await expect(page.getByTestId('mission-build-room')).toHaveAttribute('target','_blank');
  await expect(page.locator('[data-room]')).toHaveCount(0);expect(builderRequests).toEqual([]);
  await page.evaluate(()=>{window.scope={};window.review.clear();});
  await expect(page.getByTestId('task-specification-json')).toBeEmpty();
  await expect(page.locator('[data-room]')).toHaveCount(0);
});

test('pause freezes execution, resume continues, and disconnect cancels the timer',async({page})=>{
  await page.clock.install();await mount(page);
  await room(page,'tool').selectOption('fire_picture');await slot(page,5,0).click();
  await room(page,'generate').click();await room(page,'start').click();
  await room(page,'pause').click();
  await page.clock.runFor(2000);
  await expect(room(page,'timeline').locator('li')).toHaveCount(1);
  await room(page,'pause').click();await page.clock.runFor(500);
  await expect(room(page,'timeline').locator('li')).toHaveCount(2);
  await page.evaluate(()=>window.workspace.clear());await page.clock.runFor(5000);
  await expect(room(page,'timeline').locator('li')).toHaveCount(0);
  await expect(room(page,'pose')).toContainText('Place the robot');
});

test('dropdowns and text define a complete task which then executes without further instructions',async({page})=>{
  await page.clock.install();
  await page.evaluate(async()=>{
    const {mountMissionWizard}=await import('/valerian/mission-wizard.js');
    const {mountRoomWorkspace}=await import('/valerian/room-workspace.js');
    const root=document.querySelector('#root');root.innerHTML='<div id="wizard"></div><div id="room"></div>';
    window.saved=null;window.mission=null;
    mountMissionWizard(document.querySelector('#wizard'),{getMission:()=>window.mission,save:async body=>{
      window.saved=body;
      // Mission-configuration API acceptance is covered by the backend integration suite.
      window.mission={...body.fields,revision:1,missingInformation:[],approvalState:'awaiting_supervisor_approval'};
    }});
    window.workspace=mountRoomWorkspace(document.querySelector('#room'),()=>window.mission);
  });
  await page.getByTestId('mission-create').click();
  const answers=['fire_hotspot_inspection','Find printed fire indicator','Training room A','indoor_flat','ground robot',
    'low','Training room A interior','printed image; no actual fire','stop on hazards or lost link','safe',
    'confirmed','confirmed','confirmed','confirmed','confirmed'];
  for(const answer of answers){
    const control=page.getByTestId('mission-answer');
    if(await control.evaluate(el=>el.tagName==='SELECT'))await control.selectOption(answer);
    else await control.fill(answer);
    await page.getByTestId('mission-next').click();
  }
  await page.getByTestId('mission-confirm').check();await page.getByTestId('mission-next').click();
  expect(await page.evaluate(()=>window.saved.fields.location)).toBe('Training room A');
  await room(page,'tool').selectOption('door');await slot(page,1,0).click();
  await room(page,'tool').selectOption('fire_picture');await slot(page,5,0).click();
  await room(page,'generate').click();await room(page,'start').click();
  await page.clock.runFor(5000);
  await expect(room(page,'pose')).toContainText('Phase: completed');
  await expect(room(page,'timeline')).toContainText('open_door(doorId="object-1"');
  await expect(room(page,'timeline')).toContainText('report_findings(');
});

test('saved layout survives reload and stays isolated from another mission instance',async({page})=>{
  await mount(page);
  await room(page,'shape').selectOption('rectangle');
  await room(page,'tool').selectOption('door');await room(page,'locked').check();await slot(page,1,0).click();
  await room(page,'smoke').check();await room(page,'heading').selectOption('2');
  await room(page,'save').click();await expect(room(page,'status')).toContainText('Room saved');
  await page.reload();await mount(page);await room(page,'load').click();
  await expect(room(page,'shape')).toHaveValue('rectangle');
  await expect(room(page,'smoke')).toBeChecked();await expect(room(page,'heading')).toHaveValue('2');
  await expect(slot(page,1,0)).toHaveAttribute('aria-label',/locked, closed/);
  await expect(room(page,'start')).toBeDisabled(); // Loading never starts a task or marks it reviewed.
  await page.evaluate(()=>{window.scope={agentId:'another-agent'};window.workspace.clear();});
  await room(page,'load').click();await expect(room(page,'status')).toContainText('No room has been saved');
  await expect(room(page,'shape')).toHaveValue('square');
  await page.evaluate(()=>{window.scope={agentId:'room-test-agent'};window.workspace.clear();});
  await room(page,'load').click();await expect(room(page,'shape')).toHaveValue('rectangle');
});

test('portable room import and report downloads preserve the original scene and actual outcomes',async({page})=>{
  await page.clock.install();await mount(page);
  await room(page,'tool').selectOption('door');await slot(page,1,0).click();
  await room(page,'tool').selectOption('fire_picture');await slot(page,5,0).click();
  const roomDownload=page.waitForEvent('download');await room(page,'export').click();
  const document=JSON.parse(await readFile(await (await roomDownload).path(),'utf8'));
  expect(document.format).toBe('prometheus.room-scenario');expect(document.room.objects).toHaveLength(2);
  await room(page,'shape').selectOption('rectangle');
  await room(page,'import').setInputFiles({name:'room.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
  await expect(room(page,'status')).toContainText('Room loaded');await expect(room(page,'shape')).toHaveValue('square');
  const invalid=structuredClone(document);invalid.room.objects[0].x=-1;
  await room(page,'import').setInputFiles({name:'bad-room.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
  await expect(room(page,'status')).toContainText('Invalid room object');
  await expect(slot(page,1,0)).toHaveText('D'); // Rejected import leaves the current layout intact.
  await room(page,'generate').click();await room(page,'start').click();await page.clock.runFor(5000);
  await expect(room(page,'pose')).toContainText('Phase: completed');
  const reportDownload=page.waitForEvent('download');await room(page,'report').click();
  const report=JSON.parse(await readFile(await (await reportDownload).path(),'utf8'));
  expect(report.phase).toBe('completed');expect(report.operationalReady).toBe(false);
  expect(report.initialRoom.objects[0].open).toBe(false);expect(report.finalState.objects[0].open).toBe(true);
  expect(report.events.some(e=>e.action==='open_door'&&e.success)).toBe(true);
  expect(report.events.at(-1).action).toBe('report_findings');expect(report.summary.photos).toHaveLength(1);
  expect(JSON.stringify(report)).not.toContain('X-Prometheus');
  await room(page,'edit').click();
  await room(page,'import').setInputFiles({name:'run.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(report))});
  await expect(room(page,'status')).toContainText('not a run report');
  await expect(room(page,'start')).toBeEnabled(); // The existing generated room is unchanged.
  await expect(room(page,'timeline').locator('li')).toHaveCount(0);
});

for(const required of [false,true])test(`supervisor review and simulator start honour password-required=${required}`,async({page})=>{
  await page.evaluate(async({mission,required})=>{
    let current={...mission,phase:'safety_and_approval',ready:false};let run=null;
    window.requests=[];
    window.fetch=async(url,options={})=>{
      const path=String(url);
      if(options.method==='POST'){
        window.requests.push({path,headers:options.headers,body:JSON.parse(options.body)});
        if(path.endsWith('/mission-review'))current={...current,ready:true,phase:'execution_ready',approvalState:'supervisor_approved'};
        else run={phase:'awaiting_acceptance',revision:1,sequence:0,variant:'ordinary'};
      }
      const body=path.endsWith('/mission-review')?{mission:JSON.stringify(current),reviewVersion:1,safetyReference:'fixture',supervisorCredentialRequired:required}
        :path.endsWith('/storage')?[]:run;
      return new Response(JSON.stringify(body),{status:path.endsWith('/mission-execution')&&!run?404:200,headers:{'Content-Type':'application/json'}});
    };
    const {mountMissionReview}=await import('/valerian/mission-review.js');
    window.review=mountMissionReview(document.querySelector('#root'),()=>({agentId:'test-agent',accessCode:'test'}));
    await window.review.refresh();
  },{mission,required});
  await page.getByText('Mission supervisor review',{exact:true}).click();
  const input=page.getByTestId('mission-review-token');
  if(required){
    await expect(input).toBeVisible();await page.locator('[data-decision="approve"]').click();
    await expect(page.getByTestId('mission-review-status')).toContainText('Enter your supervisor credential');
    expect(await page.evaluate(()=>window.requests.length)).toBe(0);
    await input.fill('synthetic-browser-token');
  }else{
    await expect(input).toBeHidden();await expect(page.getByTestId('mission-review-password-mode')).toBeVisible();
  }
  await page.locator('[data-decision="approve"]').click();
  await expect(page.getByTestId('mission-review-status')).toContainText('Recorded: approve');
  if(required)await input.fill('synthetic-browser-token');
  await page.locator('[data-execution="start"]').click();
  await expect(page.getByTestId('mission-execution-readable')).toContainText('Simulation started');
  const requests=await page.evaluate(()=>window.requests);
  expect(requests).toHaveLength(2);
  for(const request of requests)expect(request.headers['X-Prometheus-Supervisor-Token']).toBe(required?'synthetic-browser-token':undefined);
});

test('saved missions run exact snapshots repeatedly, export identity and reject changed or corrupt bindings',async({page})=>{
  await page.clock.install();
  await page.evaluate(async mission=>{
    window.mission=mission;window.scope={agentId:'saved-a'};
    const {createRoom,place}=await import('/valerian/room-simulation.js');
    const {scenarioDocument}=await import('/valerian/room-artifacts.js');
    const room=createRoom();place(room,'door',1,0,{locked:false});place(room,'fire_picture',5,0);
    window.saved={name:'Mission A',configuredRevision:1,room:{id:'room-a',name:'Room A',revision:3,configuration:JSON.stringify(scenarioDocument(room))}};
    window.original=JSON.stringify(window.saved);
    const {mountRoomWorkspace}=await import('/valerian/room-workspace.js');
    window.workspace=mountRoomWorkspace(document.querySelector('#root'),()=>window.mission,{getScope:()=>window.scope,getSavedMission:()=>window.saved});
    window.workspace.refresh();
  },mission);
  await expect(room(page,'start')).toHaveText('Run saved mission');
  await expect(slot(page,1,0)).toHaveText('D');
  await expect(room(page,'shape')).toBeHidden();
  await room(page,'start').click();await page.clock.fastForward(15000);
  await expect(room(page,'pose')).toContainText('Phase: completed');
  const download=page.waitForEvent('download');await room(page,'report').click();
  const report=JSON.parse(await readFile(await (await download).path(),'utf8'));
  expect(report.specification.savedMission).toEqual({id:'saved-a',name:'Mission A',configuredRevision:1});
  expect(report.specification.room.savedRoomRevision).toBe(3);
  expect(report.initialRoom.objects[0].open).toBe(false);
  expect(report.finalState.objects[0].open).toBe(true);
  expect(await page.evaluate(()=>JSON.stringify(window.saved)===window.original)).toBe(true);
  await room(page,'start').click();await room(page,'pause').click();
  await expect(room(page,'pose')).toContainText('(0, 0)');
  await page.evaluate(()=>{window.mission.revision=2;window.workspace.refresh();});
  await expect(room(page,'start')).toBeDisabled();
  await expect(room(page,'status')).toContainText('save this mission again');
  await page.evaluate(async()=>{
    const {createRoom}=await import('/valerian/room-simulation.js');
    const {scenarioDocument}=await import('/valerian/room-artifacts.js');
    window.scope.agentId='saved-b';window.saved={name:'Mission B',configuredRevision:2,room:{id:'room-b',name:'Room B',revision:1,configuration:JSON.stringify(scenarioDocument(createRoom('rectangle')))}};
    window.workspace.refresh();
  });
  await expect(room(page,'grid').locator('button')).toHaveCount(40);
  await expect(room(page,'start')).toBeEnabled();
  await page.evaluate(()=>{window.saved.room.configuration='{}';window.workspace.refresh();});
  await expect(room(page,'start')).toBeDisabled();
  await expect(room(page,'status')).toContainText('Unable to run saved mission');
});

test('Start explains missing task and generation requirements and recovers after task setup',async({page})=>{
  await page.evaluate(async()=>{
    window.mission=null;
    const {mountRoomWorkspace}=await import('/valerian/room-workspace.js');
    window.workspace=mountRoomWorkspace(document.querySelector('#root'),()=>window.mission);
  });
  await room(page,'generate').click();
  await expect(room(page,'start')).toBeDisabled();
  await expect(room(page,'readiness')).toContainText('Create task');
  await page.evaluate(mission=>{window.mission=mission;window.workspace.refresh();},mission);
  await expect(room(page,'start')).toBeEnabled();
  await room(page,'tool').selectOption('fire_picture');await slot(page,5,0).click();
  await expect(room(page,'start')).toBeDisabled();
  await expect(room(page,'readiness')).toContainText('Generate room');
  await room(page,'generate').click();await room(page,'start').click();
  await expect(room(page,'pose')).toContainText('Phase: completed');
});

test('Start readiness follows incomplete, unsafe and unsupported task updates',async({page})=>{
  await mount(page);await room(page,'generate').click();await expect(room(page,'start')).toBeEnabled();
  await page.evaluate(()=>{window.mission.missingInformation=['location'];window.workspace.refresh();});
  await expect(room(page,'start')).toBeDisabled();await expect(room(page,'readiness')).toContainText('Missing: location');
  await page.evaluate(()=>{window.mission.missingInformation=[];window.mission.approvalState='blocked';window.workspace.refresh();});
  await expect(room(page,'start')).toBeDisabled();await expect(room(page,'readiness')).toContainText('Task blocked');
  await page.evaluate(()=>{window.mission.approvalState='awaiting_supervisor_approval';window.mission.environment='outdoor_open';window.workspace.refresh();});
  await expect(room(page,'start')).toBeDisabled();await expect(room(page,'readiness')).toContainText('flat indoor terrain');
  await page.evaluate(()=>{window.mission.environment='indoor_flat';window.workspace.refresh();});
  await expect(room(page,'start')).toBeEnabled();
});
