const CACHE = "puff-tracker-cache-v2";
const ASSETS = ["./","./index.html","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):Promise.resolve()))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",(e)=>{e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});
