(function(){
  const el = id=> document.getElementById(id);
  const TT = ()=> el('tt');
  let timer=null, steps=['Masterplan','Previsto','Real'], stepIndex=0, areas=[], rows=[];
  function svg(container, tiles){
    const w=container.clientWidth-2,h=container.clientHeight-2, cols=Math.ceil(Math.sqrt(tiles.length)), rowsN=Math.ceil(tiles.length/cols);
    const pad=8, tw=Math.floor((w-pad*(cols+1))/cols), th=Math.floor((h-pad*(rowsN+1))/rowsN);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('width',w); svg.setAttribute('height',h); svg.style.display='block';
    tiles.forEach((t,i)=>{ const c=i%cols,r=Math.floor(i/cols),x=pad+c*(tw+pad),y=pad+r*(th+pad);
      const g=document.createElementNS(svg.namespaceURI,'g');
      const rect=document.createElementNS(svg.namespaceURI,'rect'); rect.setAttribute('x',x);rect.setAttribute('y',y);rect.setAttribute('rx',10);rect.setAttribute('ry',10);rect.setAttribute('width',tw);rect.setAttribute('height',th);rect.setAttribute('fill',t.fill||'#ddd');rect.setAttribute('stroke','#e5e7eb');
      const label=document.createElementNS(svg.namespaceURI,'text'); label.setAttribute('x',x+8); label.setAttribute('y',y+18); label.setAttribute('font-size','12'); label.setAttribute('fill','#111'); label.textContent=t.area;
      g.appendChild(rect); g.appendChild(label); svg.appendChild(g);
      g.addEventListener('mousemove', ev=>{ const r=rows.find(k=> String(k._area)===String(t.area)); const html=r?`<b>${t.area}</b><br>Previsto: ${pct(r._prev)}<br>Real: ${pct(r._real)}<br>Masterplan: ${pct(r._mp)}${r._custo!=null?`<br>Custo/Frente: ${r._custo}`:''}`:t.area; showTT(ev.clientX,ev.clientY,html); });
      g.addEventListener('mouseleave', hideTT);
    });
    container.innerHTML=''; container.appendChild(svg);
  }
  function showTT(cx,cy,html){ const tt=TT(); tt.innerHTML=html; tt.style.opacity=1; const r=tt.parentElement.getBoundingClientRect(); tt.style.left=(cx-r.left)+'px'; tt.style.top=(cy-r.top)+'px'; }
  function hideTT(){ TT().style.opacity=0; }
  const pct = v=> v==null? '–' : (typeof v==='number'? (v*100).toFixed(0)+'%': v);
  function color(row,mode){ const p=row._prev||0,r=row._real||0; if(mode==='Previsto') return '#54aeff'; if(mode==='Masterplan') return '#c297ff'; if(mode==='Real'){ const d=r-p; if(d<-0.05) return '#facc15'; if(d>0.05) return '#22c55e'; return '#7ee787'; } return '#ddd'; }
  function recompute(mode){ const container=el('vis4d'); const tiles=areas.map(a=>{ const r=rows.find(x=> String(x._area)===String(a))||{}; return {area:a, fill: color(r,mode)};}); svg(container, tiles); el('lblStep').textContent=mode; }
  function play(){ if(timer){clearInterval(timer);timer=null;el('btnPlay').textContent='▶️ Play';return;} el('btnPlay').textContent='⏸️ Pause'; timer=setInterval(()=>{ stepIndex=(stepIndex+1)%steps.length; el('rngStep').value=String(stepIndex); recompute(steps[stepIndex]); }, 1200); }
  function setupTimeline(dates){ steps = dates&&dates.length? dates.slice(0,30): ['Masterplan','Previsto','Real']; stepIndex=0; const rng=el('rngStep'); rng.max=String(Math.max(0,steps.length-1)); rng.value='0'; el('lblStep').textContent=steps[0]; rng.oninput=()=>{ stepIndex=Number(rng.value); recompute(steps[stepIndex]); }; el('btnPlay').onclick=play; }
  window._vis4d={ init:({normRows,areaList,dates})=>{ rows=normRows; areas=areaList; setupTimeline(dates); recompute(steps[0]); }, applyArea:(sel)=>{ areas=sel&&sel.length? sel: Array.from(new Set(rows.map(r=> r._area))).sort(); recompute(steps[0]); }, goTo:(label)=>{ const i=steps.indexOf(label); if(i>=0){ stepIndex=i; el('rngStep').value=String(i); recompute(steps[i]); } } };
})();
