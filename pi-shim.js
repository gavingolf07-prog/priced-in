/* Replaces Claude's window.claude connectors so the site runs standalone.
   FMP/Firecrawl calls go through your Cloudflare Worker (keys stay there). */
(function(){
var W='https://priced-in-proxy.gavingolf07.workers.dev'; // <- your Worker URL
function J(r){return r.ok?r.json():r.text().then(function(t){throw{code:r.status>=500?'upstream_error':'http_'+r.status,message:t.slice(0,200)};});}
var mcp={
 listTools:async function(){return{servers:[{server:'FMP',authStatus:'ok',tools:[]},{server:'Firecrawl',authStatus:'ok',tools:[]}]};},
 callTool:async function(server,tool,a,o){
  a=a||{};
  if(server==='FMP'){
   var ep=a.endpoint||tool,q=new URLSearchParams();
   Object.keys(a).forEach(function(k){if(k!=='endpoint'&&a[k]!=null)q.set(k,a[k]);});
   return{payload:await J(await fetch(W+'/fmp/'+encodeURIComponent(ep)+'?'+q))};
  }
  if(tool==='firecrawl_agent_status'){
   var id=String(a.id||'').replace(/^agent_run_/,'');
   return{payload:await J(await fetch(W+'/fc/agent/'+encodeURIComponent(id)))};
  }
  var path=tool==='firecrawl_agent'?'agent':tool==='firecrawl_scrape'?'scrape':'search';
  var r=await J(await fetch(W+'/fc/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)}));
  if(path==='agent'&&r&&r.id)r.id='agent_run_'+r.id;
  return{payload:r};
 }
};
var TK='pi-sync-token';
function tok(){try{return localStorage.getItem(TK);}catch(e){return null;}}
function api(path,o){o=o||{};var h={},t=tok();if(t)h.Authorization='Bearer '+t;if(o.body)h['Content-Type']='application/json';
 return fetch(W+path,{method:o.method||'GET',headers:h,body:o.body}).then(function(r){return r.json().catch(function(){return{};}).then(function(j){if(!r.ok){var e=new Error(j.error||('http_'+r.status));e.code='http_'+r.status;throw e;}return j;});});}
var meP=null;
function me(){if(!tok())return Promise.resolve(null);if(!meP)meP=api('/auth/me').then(function(j){return j.user;}).catch(function(){try{localStorage.removeItem(TK);}catch(e){}return null;});return meP;}
function key(p){return'pi-sync-db:'+p;}
function doc(p){
 var remote=function(){return p.indexOf('data/users/')===0&&tok();},q='/db?path='+encodeURIComponent(p);
 var self={
 get:async function(){if(remote()){var j=await api(q);return{exists:!!j.exists,data:function(){return JSON.parse(j.data);}};}
  var v=null;try{v=localStorage.getItem(key(p));}catch(e){}return{exists:v!=null,data:function(){return JSON.parse(v);}};},
 set:async function(d){if(remote()){await api(q,{method:'PUT',body:JSON.stringify(d)});return;}try{localStorage.setItem(key(p),JSON.stringify(d));}catch(e){}},
 update:async function(d){var x=await self.get();await self.set(Object.assign(x.exists?x.data():{},d));},
 delete:async function(){if(remote()){await api(q,{method:'DELETE'});return;}try{localStorage.removeItem(key(p));}catch(e){}}};
 return self;}
var db={doc:doc,collection:function(c){return{doc:function(n){return doc(c+'/'+n);}};}};
var user={id:async function(){var u=await me();return u?u.id:null;},me:async function(){var u=await me();return u?{name:u.email}:{};}};
document.addEventListener('click',function(e){
 var t=e.target&&e.target.closest&&e.target.closest('#acLogin,#acReg,#acOut');if(!t)return;
 var msg=document.getElementById('acMsg');function say(m){if(msg)msg.textContent=m;}
 if(t.id==='acOut'){api('/auth/logout',{method:'POST'}).catch(function(){}).then(function(){try{localStorage.clear();}catch(x){}location.reload();});return;}
 say('Working\u2026');
 api(t.id==='acReg'?'/auth/register':'/auth/login',{method:'POST',body:JSON.stringify({email:document.getElementById('acEmail').value,password:document.getElementById('acPw').value})})
  .then(function(j){localStorage.setItem(TK,j.token);location.reload();}).catch(function(x){say(x.message);});});
var downloads={save:async function(o){var d=o.data,b=d instanceof Blob?d:new Blob([typeof d==='string'?d:JSON.stringify(d)]);var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=o.filename||'download';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},4000);}};
var m={mcp:mcp,db:db,user:user,downloads:downloads};
window.claude={use:async function(n){return m[n]||null;}};
})();
