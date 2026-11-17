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
function key(p){return'pi:'+p;}
function doc(p){return{
 get:async function(){var v=null;try{v=localStorage.getItem(key(p));}catch(e){}return{exists:v!=null,data:function(){return JSON.parse(v);}};},
 set:async function(d){try{localStorage.setItem(key(p),JSON.stringify(d));}catch(e){}},
 update:async function(d){var c={};try{c=JSON.parse(localStorage.getItem(key(p))||'{}');}catch(e){}try{localStorage.setItem(key(p),JSON.stringify(Object.assign(c,d)));}catch(e){}},
 delete:async function(){try{localStorage.removeItem(key(p));}catch(e){}}};}
var db={doc:doc,collection:function(c){return{doc:function(n){return doc(c+'/'+n);}};}};
var user={id:async function(){var u=localStorage.getItem('pi:uid');if(!u){u='local-'+Math.random().toString(36).slice(2);localStorage.setItem('pi:uid',u);}return u;}};
var downloads={save:async function(o){var d=o.data,b=d instanceof Blob?d:new Blob([typeof d==='string'?d:JSON.stringify(d)]);var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=o.filename||'download';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},4000);}};
var m={mcp:mcp,db:db,user:user,downloads:downloads};
window.claude={use:async function(n){return m[n]||null;}};
})();
