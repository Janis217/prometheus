import {test,expect} from './fixtures/offline-ui-assets.mjs';
import {readFile} from 'node:fs/promises';

// Serve source assets so this feature is checked without rebuilding/running Java.
test.beforeEach(async({page,context})=>{
  await context.route('**/valerian/**',async route=>{
    const name=new URL(route.request().url()).pathname.split('/').pop();
    const allowed=['rooms.html','room-library.css','room-library-page.js','room-library.js','room-workspace.js','room-artifacts.js','room-simulation.js','room-world.js','simulation-actions.js','simulation-action-executor.js','task-specification.js'];
    if(!allowed.includes(name))return route.continue();
    await route.fulfill({contentType:name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'text/javascript',body:await readFile(`src/main/resources/public/valerian/${name}`,'utf8')});
  });
  await page.goto('/valerian/rooms.html');
});
const item=(p,name)=>p.locator(`[data-room="${name}"]`);
const slot=(p,x,y)=>p.locator(`[data-x="${x}"][data-y="${y}"]`);

test('named room revisions retain obstacle schedules and removing furniture clears its moves',async({page})=>{
  await item(page,'tool').selectOption('chair');await slot(page,3,3).click();
  await item(page,'obstacles').locator('summary').click();
  await item(page,'obstacle-object').selectOption('object-1');await item(page,'obstacle-action').fill('2');
  await item(page,'obstacle-add').click();
  await page.locator('#room-name').fill('Moving chair');await page.locator('#save-room').click();
  await expect(page.locator('#library-status')).toHaveText('Saved Moving chair, revision 1.');
  const id=await page.locator('#saved-rooms').inputValue();await page.reload();
  await page.locator('#saved-rooms').selectOption(id);await page.locator('#open-room').click();
  await expect(item(page,'obstacle-list')).toContainText('Before action 2: object-1 to (1, 0)');
  await item(page,'tool').selectOption('erase');await slot(page,3,3).click();
  await expect(item(page,'obstacle-list').locator('li')).toHaveCount(0);
  await page.locator('#save-room').click();await expect(page.locator('#library-status')).toHaveText('Saved Moving chair, revision 2.');
  const previous=await page.evaluate(async id=>(await import('/valerian/room-library.js')).loadLibraryRoom(localStorage,id,1),id);
  expect(previous.room.obstacleMoves).toEqual([{action:2,objectId:'object-1',x:1,y:0}]);
  await page.setViewportSize({width:390,height:844});await item(page,'obstacles').locator('summary').click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('build two named rooms without a mission and restore all state after reload',async({page})=>{
  let backendRequests=0;page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/demo/'))backendRequests++;});
  await expect(item(page,'start')).toBeHidden();await expect(item(page,'save')).toBeHidden();
  await item(page,'shape').selectOption('l_shaped');await item(page,'smoke').check();
  await item(page,'heading').selectOption('3');
  await item(page,'tool').selectOption('robot');await slot(page,0,1).click();
  await item(page,'tool').selectOption('door');await item(page,'locked').check();await slot(page,1,0).click();
  await item(page,'locked').uncheck();await item(page,'open').check();await slot(page,2,0).click();
  for(const [tool,x,y] of [['window',3,0],['picture',4,0],['fire_picture',5,0],['chair',2,2],['table',3,2]]){
    await item(page,'tool').selectOption(tool);await slot(page,x,y).click();
  }
  await page.locator('#room-name').fill('Training A');await page.locator('#save-room').click();
  await expect(page.locator('#library-status')).toHaveText('Saved Training A, revision 1.');
  const first=await page.locator('#saved-rooms').inputValue();
  const original=await page.evaluate(async id=>(await import('/valerian/room-library.js')).loadLibraryRoom(localStorage,id),first);
  await page.locator('#new-room').click();await item(page,'shape').selectOption('rectangle');
  await page.locator('#room-name').fill('Training B');await page.locator('#save-room').click();
  await expect(page.locator('#library-status')).toHaveText('Saved Training B, revision 1.');
  await page.reload();await expect(page.locator('#saved-rooms option')).toHaveCount(3);
  await page.locator('#saved-rooms').selectOption(first);await page.locator('#open-room').click();
  await expect(item(page,'shape')).toHaveValue('l_shaped');await expect(item(page,'smoke')).toBeChecked();
  await expect(item(page,'heading')).toHaveValue('3');await expect(slot(page,6,6)).toBeHidden();
  await expect(slot(page,1,0)).toHaveAttribute('aria-label',/locked, closed/);
  await expect(slot(page,2,0)).toHaveAttribute('aria-label',/unlocked, open/);
  const downloadPromise=page.waitForEvent('download');await item(page,'export').click();
  const restored=JSON.parse(await readFile(await (await downloadPromise).path(),'utf8'));
  expect(restored.room).toEqual(original.room);
  await item(page,'smoke').uncheck();await page.locator('#save-room').click();
  await expect(page.locator('#library-status')).toHaveText('Saved Training A, revision 2.');
  expect(await page.evaluate(async id=>(await import('/valerian/room-library.js')).loadLibraryRoom(localStorage,id,1),first)).toEqual(original);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(backendRequests).toBe(0);
});

test('import/export work before login and invalid saves/imports retain the draft',async({page})=>{
  await item(page,'shape').selectOption('rectangle');
  await page.locator('#save-room').click();await expect(page.locator('#library-status')).toContainText('room name');
  await expect(item(page,'shape')).toHaveValue('rectangle');
  await item(page,'import').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});
  await expect(item(page,'status')).toContainText('version 1 room scenario');await expect(item(page,'shape')).toHaveValue('rectangle');
  const downloadPromise=page.waitForEvent('download');await item(page,'export').click();
  const exported=await readFile(await (await downloadPromise).path());
  await page.locator('#new-room').click();
  await item(page,'import').setInputFiles({name:'room.json',mimeType:'application/json',buffer:exported});
  await expect(item(page,'shape')).toHaveValue('rectangle');
  await page.locator('#room-name').fill('Imported');await page.locator('#save-room').click();
  await expect(page.locator('#library-status')).toHaveText('Saved Imported, revision 1.');
});

test('another tab cannot silently overwrite a newer revision',async({page,context})=>{
  await page.locator('#room-name').fill('Shared');await page.locator('#save-room').click();
  await expect(page.locator('#library-status')).toHaveText('Saved Shared, revision 1.');
  const id=await page.locator('#saved-rooms').inputValue();
  const other=await context.newPage();await other.goto('/valerian/rooms.html');
  await other.locator('#saved-rooms').selectOption(id);await other.locator('#open-room').click();
  await item(other,'smoke').check();await other.locator('#room-name').fill('Shared updated');await other.locator('#save-room').click();
  await expect(other.locator('#library-status')).toHaveText('Saved Shared updated, revision 2.');
  await page.locator('#save-room').click();await expect(page.locator('#library-status')).toContainText('newer saved revision');
  await expect(item(page,'smoke')).not.toBeChecked();
  await page.locator('#save-copy').click();await expect(page.locator('#library-status')).toHaveText('Saved Shared, revision 1.');
  await expect(page.locator('#saved-rooms option')).toHaveCount(3);
  await other.close();
});

test('full browser storage reports failure and retains the working layout',async({page})=>{
  await item(page,'shape').selectOption('l_shaped');await page.locator('#room-name').fill('Keep this');
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await page.locator('#save-room').click();await expect(page.locator('#library-status')).toContainText('could not be saved');
  await expect(item(page,'shape')).toHaveValue('l_shaped');await expect(page.locator('#room-name')).toHaveValue('Keep this');
  await expect(page.locator('#room-identity')).toHaveText('Unsaved room');
});
