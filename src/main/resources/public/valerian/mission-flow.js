const el=id=>document.getElementById(id),accessKey='prometheus.valerian.accessCode';
let accessCode=sessionStorage.getItem(accessKey)||'',busy=false;
function show(id){for(const name of ['home','access'])el(name).hidden=name!==id;el('flow-status').textContent='';}
function message(error){el('flow-status').textContent=error.message||String(error);}
async function openMission(id=null){
  if(busy)return;busy=true;el('start-mission').disabled=true;
  try{
    if(!accessCode){show('access');el('access-code').focus();return;}
    if(!id){
      const response=await fetch('/demo/agents',{method:'POST',headers:{'Content-Type':'application/json','X-Prometheus-Access-Code':accessCode},body:JSON.stringify({agentDefinitionKey:'core.disaster_mission_configuration'})});
      if(response.status===401){sessionStorage.removeItem(accessKey);accessCode='';show('access');throw new Error('Enter a valid access code.');}
      if(!response.ok)throw new Error(`Unable to create the mission (${response.status}). Try again.`);
      id=(await response.json()).id;
    }
    location.assign(`cockpit.html?setup=mission&agentId=${encodeURIComponent(id)}`);
  }catch(error){message(error);}finally{busy=false;el('start-mission').disabled=false;}
}
// Mission setup stays in the full Valerian interface; room editing and playback use their own tabs.
el('start-mission').onclick=()=>void openMission();
el('access-form').onsubmit=event=>{
  event.preventDefault();accessCode=el('access-code').value.trim();if(!accessCode)return;
  sessionStorage.setItem(accessKey,accessCode);void openMission(new URL(location.href).searchParams.get('mission'));
};
for(const button of document.querySelectorAll('[data-home]'))button.onclick=()=>{show('home');history.replaceState(null,'',location.pathname);};
const selected=new URL(location.href).searchParams.get('mission');
if(selected)void openMission(selected);
