const STORAGE_KEY = "puffTracker.entries.v3";
const SETTINGS_KEY = "puffTracker.settings.v3";

function loadEntries(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");}catch{return [];} }
function saveEntries(entries){ localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }

function loadSettings(){ try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");}catch{return {};} }
function saveSettings(settings){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }

function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function endOfToday(){ const d=new Date(); d.setHours(24,0,0,0); return d; }

function fmtTime(ts){ const d=new Date(ts); return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}); }
function entriesToday(entries){ const a=startOfToday().getTime(), b=endOfToday().getTime(); return entries.filter(e=>e.ts>=a && e.ts<b); }
function sumPuffs(entries){ return entries.reduce((acc,e)=>acc+(Number(e.puffs)||0),0); }

function status(total,target){ const pct=target>0?(total/target):0;
  if(pct>=1) return {cls:"danger",text:"Over target"};
  if(pct>=0.8) return {cls:"warn",text:"Approaching target"};
  return {cls:"",text:"On track"};
}

function download(filename,text){
  const el=document.createElement("a");
  el.setAttribute("href","data:text/plain;charset=utf-8,"+encodeURIComponent(text));
  el.setAttribute("download",filename);
  el.style.display="none";
  document.body.appendChild(el); el.click(); document.body.removeChild(el);
}

function toCSV(entries){
  const header=["timestamp_iso","puffs","notes"].join(",");
  const lines=entries.map(e=>{
    const iso=new Date(e.ts).toISOString();
    const p=Number(e.puffs)||0;
    const n=String(e.notes||"").replaceAll('"','""');
    return `${iso},${p},"${n}"`;
  });
  return [header,...lines].join("\n");
}

function registerServiceWorker(){ if("serviceWorker" in navigator){ navigator.serviceWorker.register("./sw.js").catch(()=>{}); } }

function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),900);
}

function getNum(key,fallback){
  const s=loadSettings(); const v=Number(s[key]);
  return Number.isFinite(v)?v:fallback;
}
function getStr(key,fallback){
  const s=loadSettings(); const v=s[key];
  return (typeof v==="string" && v.length)?v:fallback;
}

function setDefaultsIfMissing(){
  const s=loadSettings();
  const merged={
    target: (Number.isFinite(Number(s.target)) && Number(s.target)>0) ? Number(s.target) : 300,
    defaultPuffs: (Number.isFinite(Number(s.defaultPuffs)) && Number(s.defaultPuffs)>0) ? Number(s.defaultPuffs) : 15,
    puffsPerCig: (Number.isFinite(Number(s.puffsPerCig)) && Number(s.puffsPerCig)>0) ? Number(s.puffsPerCig) : 20,
    cigsPerDay: (Number.isFinite(Number(s.cigsPerDay)) && Number(s.cigsPerDay)>=0) ? Number(s.cigsPerDay) : 15,
    nicStrength: (Number.isFinite(Number(s.nicStrength)) && Number(s.nicStrength)>=0) ? Number(s.nicStrength) : 0,
    mlPerPuff: (Number.isFinite(Number(s.mlPerPuff)) && Number(s.mlPerPuff)>=0) ? Number(s.mlPerPuff) : 0,
    sheetUrl: (typeof s.sheetUrl==="string") ? s.sheetUrl : ""
  };
  saveSettings(merged);
}

function render(){
  const target=getNum("target",300);
  const defaultPuffs=getNum("defaultPuffs",15);
  const puffsPerCig=getNum("puffsPerCig",20);
  const nicStrength=getNum("nicStrength",0);
  const mlPerPuff=getNum("mlPerPuff",0);
  const sheetUrl=getStr("sheetUrl","");

  const entries=loadEntries();
  const todays=entriesToday(entries).sort((a,b)=>b.ts-a.ts);
  const total=sumPuffs(todays);
  const remaining=Math.max(0,target-total);

  document.getElementById("targetLabel").textContent=String(target);
  document.getElementById("todayTotal").textContent=String(total);
  document.getElementById("remaining").textContent=String(remaining);
  document.getElementById("defaultLabel").textContent=String(defaultPuffs);

  const cigEquiv=puffsPerCig>0?(total/puffsPerCig):0;
  document.getElementById("cigEquiv").textContent=cigEquiv.toFixed(1);

  if(nicStrength>0 && mlPerPuff>0){
    const nicMg=total*mlPerPuff*nicStrength;
    document.getElementById("nicMg").textContent=nicMg.toFixed(1);
  } else {
    document.getElementById("nicMg").textContent="—";
  }

  const st=status(total,target);
  const pill=document.getElementById("statusPill");
  const stText=document.getElementById("statusText");
  pill.className="pill "+(st.cls||"");
  stText.textContent=st.text;

  document.getElementById("target").value=String(target);
  document.getElementById("defaultPuffs").value=String(defaultPuffs);
  document.getElementById("puffsPerCig").value=String(puffsPerCig);
  document.getElementById("cigsPerDay").value=String(getNum("cigsPerDay",15));
  document.getElementById("nicStrength").value=String(nicStrength);
  document.getElementById("mlPerPuff").value=String(mlPerPuff);
  document.getElementById("sheetUrl").value=sheetUrl;

  const link=document.getElementById("sheetLink");
  if(sheetUrl){ link.href=sheetUrl; link.style.opacity="1"; link.style.pointerEvents="auto"; }
  else { link.href="#"; link.style.opacity="0.5"; link.style.pointerEvents="none"; }

  const tbody=document.getElementById("todayTable");
  tbody.innerHTML="";
  for(const e of todays.slice(0,80)){
    const tr=document.createElement("tr");
    const tdT=document.createElement("td"); tdT.textContent=fmtTime(e.ts);
    const tdP=document.createElement("td"); tdP.textContent=String(e.puffs);
    const tdN=document.createElement("td"); tdN.textContent=e.notes||"";
    tr.appendChild(tdT); tr.appendChild(tdP); tr.appendChild(tdN);
    tbody.appendChild(tr);
  }
}

function addEntry(puffs,notes){
  const target=getNum("target",300);
  const entries=loadEntries();
  const todays=entriesToday(entries);
  const total=sumPuffs(todays);

  const nextTotal=total+(Number(puffs)||0);
  if(nextTotal>target){
    const overBy=nextTotal-target;
    const ok=confirm(`This will put you OVER your target by ${overBy} puff(s). Log anyway?`);
    if(!ok) return;
  }
  entries.push({ts:Date.now(), puffs:Number(puffs)||1, notes:notes||""});
  saveEntries(entries);
  render();
  toast(`Logged +${puffs}`);
}

function undoLast(){ const entries=loadEntries(); if(entries.length===0) return; entries.pop(); saveEntries(entries); render(); toast("Undid last"); }
function clearToday(){
  const entries=loadEntries();
  const a=startOfToday().getTime(), b=endOfToday().getTime();
  saveEntries(entries.filter(e=>!(e.ts>=a && e.ts<b)));
  render(); toast("Cleared today");
}
function clearAll(){ saveEntries([]); render(); toast("Cleared all"); }

function init(){
  registerServiceWorker();
  setDefaultsIfMissing();

  document.getElementById("logBtn").addEventListener("click",()=>{
    const notes=document.getElementById("notes").value.trim();
    addEntry(getNum("defaultPuffs",15), notes);
    document.getElementById("notes").value="";
  });

  document.querySelectorAll('button[data-add]').forEach(btn=>{
    btn.addEventListener("click",()=>{
      const add=Number(btn.getAttribute("data-add")||"1");
      const notes=document.getElementById("notes").value.trim();
      addEntry(add, notes);
      document.getElementById("notes").value="";
    });
  });

  document.getElementById("logCustomBtn").addEventListener("click",()=>{
    const puffs=Number(document.getElementById("puffsToAdd").value||15);
    const notes=document.getElementById("notes").value.trim();
    if(!Number.isFinite(puffs) || puffs<=0) return;
    addEntry(puffs, notes);
    document.getElementById("notes").value="";
  });

  document.getElementById("undoBtn").addEventListener("click",()=>undoLast());

  document.getElementById("exportBtn").addEventListener("click",()=>{
    const csv=toCSV(loadEntries());
    download(`puff-tracker_${new Date().toISOString().slice(0,10)}.csv`, csv);
    toast("Exported CSV");
  });

  document.getElementById("clearTodayBtn").addEventListener("click",()=>{ if(confirm("Clear only today's entries?")) clearToday(); });
  document.getElementById("clearAllBtn").addEventListener("click",()=>{ if(confirm("Clear ALL history?")) clearAll(); });

  document.getElementById("saveTargetBtn").addEventListener("click",()=>{
    const target=Number(document.getElementById("target").value||300);
    if(!Number.isFinite(target)||target<=0) return;
    saveSettings({ ...loadSettings(), target }); render(); toast("Target saved");
  });

  document.getElementById("saveDefaultBtn").addEventListener("click",()=>{
    const defaultPuffs=Number(document.getElementById("defaultPuffs").value||15);
    if(!Number.isFinite(defaultPuffs)||defaultPuffs<=0) return;
    saveSettings({ ...loadSettings(), defaultPuffs }); render(); toast("Default saved");
  });

  document.getElementById("saveEquivBtn").addEventListener("click",()=>{
    const puffsPerCig=Number(document.getElementById("puffsPerCig").value||20);
    if(!Number.isFinite(puffsPerCig)||puffsPerCig<=0) return;
    saveSettings({ ...loadSettings(), puffsPerCig }); render(); toast("Equivalence saved");
  });

  document.getElementById("saveCigsBtn").addEventListener("click",()=>{
    const cigsPerDay=Number(document.getElementById("cigsPerDay").value||15);
    if(!Number.isFinite(cigsPerDay)||cigsPerDay<0) return;
    saveSettings({ ...loadSettings(), cigsPerDay }); render(); toast("Baseline saved");
  });

  document.getElementById("setTargetFromCigsBtn").addEventListener("click",()=>{
    const puffsPerCig=Number(document.getElementById("puffsPerCig").value||20);
    const cigsPerDay=Number(document.getElementById("cigsPerDay").value||15);
    if(!Number.isFinite(puffsPerCig)||puffsPerCig<=0) return;
    if(!Number.isFinite(cigsPerDay)||cigsPerDay<0) return;
    const target=Math.round(puffsPerCig*cigsPerDay);
    saveSettings({ ...loadSettings(), target }); render(); toast("Target set from baseline");
  });

  document.getElementById("saveNicBtn").addEventListener("click",()=>{
    const nicStrength=Number(document.getElementById("nicStrength").value||0);
    if(!Number.isFinite(nicStrength)||nicStrength<0) return;
    saveSettings({ ...loadSettings(), nicStrength }); render(); toast("Nicotine saved");
  });

  document.getElementById("saveMlBtn").addEventListener("click",()=>{
    const mlPerPuff=Number(document.getElementById("mlPerPuff").value||0);
    if(!Number.isFinite(mlPerPuff)||mlPerPuff<0) return;
    saveSettings({ ...loadSettings(), mlPerPuff }); render(); toast("mL/puff saved");
  });

  document.getElementById("saveSheetBtn").addEventListener("click",()=>{
    const sheetUrl=String(document.getElementById("sheetUrl").value||"").trim();
    saveSettings({ ...loadSettings(), sheetUrl }); render(); toast("Link saved");
  });

  render();
}
init();
