(function(){
  // ---- Helpers ----
  const $ = sel => document.querySelector(sel);
  const logEl = () => $('#log');
  const selArea = () => $('#selArea');
  const selData = () => $('#selData');

  const num = v => { if (typeof v === 'number') return v; if (typeof v === 'string') { const t=v.trim().replace(/\s/g,'').replace(',', '.'); const n=Number(t); return isNaN(n)?0:n; } return 0; };
  const toPct = v => (v*100);

  function normalizeRows(rows){
    return rows.map(r=>({
      _area: r['Área'] ?? r['Area'] ?? r['area'] ?? r['ARÉA'] ?? r['arEa'],
      _prev: r['Previsto']!=null ? num(r['Previsto']) : (r['Planejado']!=null? num(r['Planejado']) : null),
      _real: r['Real']!=null ? num(r['Real']) : (r['Real2']!=null? num(r['Real2']) : null),
      _mp: r['Masterplan']!=null ? num(r['Masterplan']) : null,
      _custo: r['custo por frente']!=null ? num(r['custo por frente']) : null,
      _data: r['Data'] ?? r['data'] ?? r['DATE'] ?? null,
      _raw: r
    })).filter(r=> r._area);
  }

  function uniqueSorted(arr){ return Array.from(new Set(arr)).filter(v=> v!=null && v!=='').sort(); }

  function buildFilters(rows){
    const areas = uniqueSorted(rows.map(r=> r._area));
    selArea().innerHTML = areas.map(a=>`<option value="${a}">${a}</option>`).join('');
    const dates = uniqueSorted(rows.map(r=> r._data)).filter(Boolean);
    const marcos = ['Masterplan','Previsto','Real'];
    const values = dates.length? dates : marcos;
    selData().innerHTML = values.map(v=>`<option value="${v}">${v}</option>`).join('');
    window._vis4d.init({ normRows: rows, areaList: areas, dates });
  }

  function applyFilters(rows){
    const areasSel = Array.from(selArea().selectedOptions).map(o=> o.value);
    const dateSel = selData().value || null;
    const filtered = rows.filter(r=> !areasSel.length || areasSel.includes(String(r._area)));
    window._vis4d.applyArea(areasSel);
    if(dateSel) window._vis4d.goTo(dateSel);
    window._map.render(filtered);
    return {rows: filtered, areasSel, dateSel};
  }

  function buildTimeline(rows){
    const items = rows.map(r=>({ area:r._area, desvio: (r._real||0) - (r._prev||0), custo:r._custo||0, dir: r._raw['Empregados Diretos']||0, ind:r._raw['Empregados Indiretos']||0, evo: (r._raw['evolução maturidade']||'').toString().toLowerCase?.() === 'sim' }))
      .sort((a,b)=> (a.desvio - b.desvio)).slice(0,5);
    const ol = document.getElementById('timeline');
    ol.innerHTML = items.map(i=>`<li><b>${i.area}</b> — Desvio: ${(i.desvio*100).toFixed(1)}pp; Custo: ${i.custo}; Diretos: ${i.dir}; Indiretos: ${i.ind}; Evolução: ${i.evo?'Sim':'Não'}</li>`).join('');
  }

  // ---- Charts ----
  let chartPRM, chartCurvaS, chartDesvioCusto;
  function renderPRM(rows){
    const L = rows.map(r=> r._area);
    const Dprev = rows.map(r=> toPct(r._prev||0));
    const Dreal = rows.map(r=> toPct(r._real||0));
    const Dmp = rows.map(r=> toPct(r._mp||0));
    const ctx = document.getElementById('chartPRM');
    if(chartPRM) chartPRM.destroy();
    chartPRM = new Chart(ctx, { type:'bar', data:{ labels:L, datasets:[
      {label:'Previsto', data:Dprev, backgroundColor:'rgba(84,174,255,0.8)'},
      {label:'Real', data:Dreal, backgroundColor:'rgba(34,197,94,0.8)'},
      {label:'Masterplan', data:Dmp, backgroundColor:'rgba(194,151,255,0.8)'}
    ]}, options:{ responsive:true, scales:{ y:{beginAtZero:true, ticks:{callback:v=> v+'%'}} } } });
  }
  function renderCurvaS(rows, dates){
    const labels = (dates&&dates.length? dates.slice(0,12): ['Masterplan','Previsto','Real']);
    const avg = arr=> arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
    const ser = key => labels.map((_,i)=> toPct(((i+1)/labels.length) * avg(rows.map(r=> r[key]||0))));
    const ctx = document.getElementById('chartCurvaS');
    if(chartCurvaS) chartCurvaS.destroy();
    chartCurvaS = new Chart(ctx, { type:'line', data:{ labels, datasets:[
      {label:'Previsto (média)', data:ser('_prev'), borderColor:'#54aeff', tension:.25},
      {label:'Real (média)', data:ser('_real'), borderColor:'#22c55e', tension:.25},
      {label:'Masterplan (média)', data:ser('_mp'), borderColor:'#c297ff', borderDash:[6,4], tension:.25}
    ]}, options:{ responsive:true, scales:{ y:{beginAtZero:true, ticks:{callback:v=> v+'%'}} } } });
  }
  function renderDesvioCusto(rows){
    const pts = rows.map(r=>({ x: ((r._real||0)-(r._prev||0))*100, y: r._custo||0, area:r._area }));
    const ctx = document.getElementById('chartDesvioCusto');
    if(chartDesvioCusto) chartDesvioCusto.destroy();
    chartDesvioCusto = new Chart(ctx, { type:'scatter', data:{ datasets:[{ label:'Desvio vs Custo', data:pts, backgroundColor: pts.map(p=> p.x<-5? 'rgba(250,204,21,0.9)': (p.x>5?'rgba(34,197,94,0.8)':'rgba(126,231,135,0.8)')), borderColor:'rgba(0,0,0,0.1)' }] }, options:{ plugins:{ tooltip:{ callbacks:{ label:c=> `${c.raw.area}: ${c.raw.x.toFixed(1)}pp, custo ${c.raw.y}` } } }, scales:{ x:{title:{display:true,text:'Desvio (p.p.)'}}, y:{title:{display:true,text:'Custo por frente'}} } } });
  }

  async function boot(){
    try{
      const wb = await loadExcelSmart({ relativePath: 'data/Base.xlsx', cacheBust: true });
      const first = wb.SheetNames[0];
      const rows0 = XLSX.utils.sheet_to_json(wb.Sheets[first]);
      const rows = normalizeRows(rows0);

      buildFilters(rows);
      const {rows: fr} = applyFilters(rows);

      // Preview e timeline
      logEl().textContent = JSON.stringify(fr.slice(0,5).map(r=> r._raw), null, 2);
      buildTimeline(fr);

      // Charts
      renderPRM(fr);
      const dates = Array.from(new Set(rows.map(r=> r._data))).filter(Boolean).sort();
      renderCurvaS(fr, dates);
      renderDesvioCusto(fr);

      // Eventos
      $('#btnReload').onclick = ()=> boot();
      $('#btnClear').onclick = ()=>{ Array.from(selArea().options).forEach(o=> o.selected=false); selData().selectedIndex=0; boot(); };
      selArea().onchange = ()=>{ const {rows: fr2} = applyFilters(rows); buildTimeline(fr2); renderPRM(fr2); renderDesvioCusto(fr2); };
      selData().onchange = ()=>{ const {rows: fr2} = applyFilters(rows); buildTimeline(fr2); renderPRM(fr2); renderDesvioCusto(fr2); };

    }catch(err){
      logEl().textContent = 'Falha: ' + err.message;
      console.error(err);
    }
  }

  window.addEventListener('load', boot);
})();
