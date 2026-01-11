
const SESSION_KEY='session.v4';
const SETTINGS_KEY='settings.v4';
let autoTimer=null;

function loadSession(){return JSON.parse(localStorage.getItem(SESSION_KEY)||'{}');}
function saveSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s));}
function clearSession(){localStorage.removeItem(SESSION_KEY);}

function loadSettings(){return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');}
function saveSettings(s){localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));}

function toast(m){const t=document.getElementById('toast');t.textContent=m;}

function getAutoEnd(){return Number(loadSettings().autoEndMinutes)||5;}

function scheduleAutoEnd(){
 clearTimeout(autoTimer);
 autoTimer=setTimeout(()=>{
  const s=loadSession();
  if(s.active) endSession(true);
 },getAutoEnd()*60000);
}

function render(){
 const s=loadSession();
 document.getElementById('sessionCount').textContent=s.count||0;
 document.getElementById('sessionState').textContent=s.active?'Session active':'No active session';
}

function startSession(){
 saveSession({active:true,count:0});
 scheduleAutoEnd();
 render();toast('Session started');
}

function hit(){
 const s=loadSession();if(!s.active)return;
 s.count++;saveSession(s);render();
}

function endSession(auto=false){
 clearSession();clearTimeout(autoTimer);
 render();toast(auto?'Auto ended':'Session logged');
}

function cancelSession(){
 clearSession();clearTimeout(autoTimer);
 render();toast('Canceled');
}

document.getElementById('startSessionBtn').onclick=startSession;
document.getElementById('hitBtn').onclick=hit;
document.getElementById('endBtn').onclick=()=>endSession(false);
document.getElementById('cancelBtn').onclick=cancelSession;
document.getElementById('saveAutoBtn').onclick=()=>{
 saveSettings({autoEndMinutes:Number(document.getElementById('autoEndMinutes').value)||5});
 toast('Saved');
};

const s=loadSession();if(s.active)scheduleAutoEnd();render();
