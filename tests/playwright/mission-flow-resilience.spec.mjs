import {test,expect} from './fixtures/offline-ui-assets.mjs';
import {createRoom,place} from '../../src/main/resources/public/valerian/room-simulation.js';
import {scenarioDocument} from '../../src/main/resources/public/valerian/room-artifacts.js';

function savedReview(){
  const room=createRoom();place(room,'fire_picture',5,0);
  return {mission:JSON.stringify({missionType:'fire_hotspot_inspection',objective:'Find printed fire indicator',environment:'indoor_flat',revision:1,missingInformation:[],approvalState:'awaiting_supervisor_approval'}),
    savedMission:{name:'Resilience mission',configuredRevision:1,room:{id:'00000000-0000-0000-0000-000000000001',revision:1,name:'Resilience room',configuration:JSON.stringify(scenarioDocument(room))}}};
}
async function openPlayer(page,state){
  await page.route('**/demo/agents/*/mission-review',route=>route.fulfill({status:state.status||200,json:state.review}));
  await page.goto('/');await page.evaluate(()=>sessionStorage.setItem('prometheus.valerian.accessCode','test-scope'));
  await page.goto('/valerian/simulation.html?mission=00000000-0000-0000-0000-000000000001');
  await expect(page.locator('#player-phase')).toHaveText('Ready');await page.clock.install();
}
test('revoked access invalidates a paused run and prevents resume or further movement',async({page})=>{
  const state={review:savedReview()};await openPlayer(page,state);
  await page.locator('#start').click();await page.clock.runFor(500);await page.locator('#pause').click();
  const pose=await page.locator('#pose').textContent(),steps=await page.locator('#timeline li').count();
  state.status=401;await page.clock.runFor(3500);
  await expect(page.locator('#player-status')).toContainText('valid access code');await expect(page.locator('#player-access')).toBeVisible();
  await expect(page.locator('#start')).toBeDisabled();await expect(page.locator('#pause')).toBeDisabled();
  await page.clock.runFor(5000);await expect(page.locator('#timeline li')).toHaveCount(steps);await expect(page.locator('#pose')).toHaveText(pose);
});
test('temporary server loss stops an active run; explicit reload restores the saved start without auto-running',async({page})=>{
  const state={review:savedReview()};await openPlayer(page,state);
  await page.locator('#start').click();state.status=503;await page.clock.runFor(3100);
  await expect(page.locator('#player-status')).toContainText('Check the connection');await expect(page.locator('#start')).toBeDisabled();
  const steps=await page.locator('#timeline li').count();await page.clock.runFor(3000);await expect(page.locator('#timeline li')).toHaveCount(steps);
  state.status=200;await page.locator('#reload-mission').click();await expect(page.locator('#player-phase')).toHaveText('Ready');
  await expect(page.locator('#timeline li')).toHaveCount(0);await expect(page.locator('#scene [data-x="0"][data-y="0"]')).toHaveText('→');
  await page.clock.runFor(5000);await expect(page.locator('#timeline li')).toHaveCount(0);await expect(page.locator('#start')).toBeEnabled();
});
test('blocked safety update at the same revision invalidates a paused run',async({page})=>{
  const state={review:savedReview()};await openPlayer(page,state);
  await page.locator('#start').click();await page.locator('#pause').click();
  state.review={...state.review,mission:JSON.stringify({...JSON.parse(state.review.mission),approvalState:'blocked'})};
  await page.clock.runFor(3500);await expect(page.locator('#player-status')).toContainText('Mission changed');
  await expect(page.locator('#start')).toBeDisabled();await page.locator('#reload-mission').click();
  await expect(page.locator('#player-status')).toContainText('safety checks');await expect(page.locator('#player')).toBeHidden();
});
test('invalid access during mission creation keeps a usable login screen and does not navigate to a cockpit',async({page})=>{
  await page.route('**/demo/agents',route=>route.fulfill({status:401,json:{}}));
  await page.goto('/');await page.locator('#start-mission').click();await page.locator('#access-code').fill('BAD01');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('#flow-status')).toContainText('valid access code');await expect(page.locator('#access')).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('prometheus.valerian.accessCode'))).toBeNull();
  expect(page.url()).not.toContain('cockpit.html');await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
});
