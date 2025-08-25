// Loader p/ GitHub Pages com encoding para RAW e caminho padrão /data/Base.xlsx
async function fetchArrayBuffer(url, opts={}){
  const res = await fetch(url, {cache: 'no-store', ...opts});
  if(!res.ok){
    const text = await res.text().catch(()=> '');
    const msg = `HTTP ${res.status} ao baixar ${url}` + (text ? `\n${text.slice(0,200)}` : '');
    throw new Error(msg);
  }
  return await res.arrayBuffer();
}
function getPagesBaseUrl(){
  const {origin, pathname, hostname} = window.location;
  const segs = pathname.split('/').filter(Boolean);
  if(hostname.endsWith('github.io') && segs.length){ return `${origin}/${segs[0]}/`; }
  return origin + pathname.replace(/\/[^\/]*$/, '/');
}
function buildUrlRelative(rel){ const base = getPagesBaseUrl(); return new URL(rel.replace(/^\//,''), base).toString(); }
function parseGhIdentity(){ const h=location.hostname; const u=h.endsWith('github.io')?h.split('.')[0]:null; const r=location.pathname.split('/').filter(Boolean)[0]||null; return {user:u, repo:r}; }
const encRaw = p => p.split('/').map(encodeURIComponent).join('/');
async function loadExcelSmart({relativePath='data/Base.xlsx', branch='main', cacheBust=true}={}){
  const qs = cacheBust ? `?v=${Date.now()}` : '';
  const relUrl = buildUrlRelative(relativePath) + qs;
  try{ const buf = await fetchArrayBuffer(relUrl); return XLSX.read(buf,{type:'array'}); }catch(e){ console.warn('Falhou relativo; tentando RAW', e); }
  const {user,repo}=parseGhIdentity(); if(!user||!repo) throw new Error('Sem user/repo p/ RAW');
  const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${encRaw(relativePath.replace(/^\//,''))}` + qs;
  const buf = await fetchArrayBuffer(rawUrl); return XLSX.read(buf,{type:'array'});
}
window.loadExcelSmart = loadExcelSmart;
