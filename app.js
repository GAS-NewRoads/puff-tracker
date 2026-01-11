const ENTRIES_KEY='entries.v1';
const SESSION_KEY='session.v1';
const SETTINGS_KEY='settings.v1';
let autoTimer=null;

function load(k){return JSON.parse(localStorage.getItem(k)||'[]');}
function save(k,v){localStorage.setItem(k,JSON.stringify(v));}

function todayEntries(){
 const a=new Date();a.setHours(0,0,0,0);
 return load(ENTRIES_KEY).filter(e=>e.ts>=a.getTime());
}

function render(){
 const total=todayEntries().reduce((a,b)=>a+b.puffs,0);
 document.getElementById('todayTotal').textContent=total;
 document.getElementById('targetLabel').textContent=300;

 const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'{}');
 document.getElementById('sessionCount').textContent=s.count||0;
 document.getElementById('sessionState').textContent=s.active?'Session active':'No active session';
}

function quickAdd(n){
 const entries=load(ENTRIES_KEY);
 entries.push({ts:Date.now(),puffs:n});
 save(ENTRIES_KEY,entries);
 render();
}

function startSession(){
 const s={active:true,count:0,start:Date.now()};
 localStorage.setItem(SESSION_KEY,JSON.stringify(s));
 scheduleAutoEnd();
 render();
}

function hit(){
 const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'{}');
 if(!s.active) return;
 s.count++;
 localStorage.setItem(SESSION_KEY,JSON.stringify(s));
 render();
}

function endSession(auto=false){
 const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'{}');
 if(!s.active) return;
 const entries=load(ENTRIES_KEY);
 entries.push({ts:Date.now(),puffs:s.count});
 save(ENTRIES_KEY,entries);
 clearSession();
 render();
}

function clearSession(){
 localStorage.removeItem(SESSION_KEY);
 clearTimeout(autoTimer);
}

function getAutoEnd(){
 const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
 return s.auto||5;
}

function scheduleAutoEnd(){
 clearTimeout(autoTimer);
 autoTimer=setTimeout(()=>{
   const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'{}');
   if(s.active) endSession(true);
 },getAutoEnd()*60000);
}

function exportCSV(){
 const rows=load(ENTRIES_KEY);
 let csv='timestamp,puffs\n';
 rows.forEach(r=>csv+=`${new Date(r.ts).toISOString()},${r.puffs}\n`);
 const a=document.createElement('a');
 a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
 a.download='puffs.csv';
 a.click();
}

document.getElementById('startBtn').onclick=startSession;
document.getElementById('hitBtn').onclick=hit;
document.getElementById('endBtn').onclick=()=>endSession(false);
document.getElementById('cancelBtn').onclick=clearSession;
document.getElementById('saveAuto').onclick=()=>{
 save(SETTINGS_KEY,{auto:Number(document.getElementById('autoEnd').value)||5});
};

render();
