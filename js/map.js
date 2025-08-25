// Mapa Leaflet com tooltips a partir do Excel
(function(){
  const normNum = v => {
    if (v==null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'string'){
      const t = v.trim().replace(/\s/g,'').replace(',', '.');
      const n = Number(t);
      return isNaN(n) ? null : n;
    }
    return null;
  };

  let map, layer;

  function ensureMap(){
    if (map) return map;
    map = L.map('map', { zoomControl: true, attributionControl: true });
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });
    tiles.addTo(map);
    return map;
  }

  function tooltipHtml(r){
    const pct = v => v==null? '–' : (typeof v==='number'? (v*100).toFixed(0)+'%' : v);
    const lines = [
      `<b>${r._area}</b>`,
      `Previsto: ${pct(r._prev)}`,
      `Real: ${pct(r._real)}`,
      `Masterplan: ${pct(r._mp)}`
    ];
    if (r._custo!=null) lines.push(`Custo/Frente: ${r._custo}`);
    if (r._raw['Empregados Diretos']!=null) lines.push(`Diretos: ${r._raw['Empregados Diretos']}`);
    if (r._raw['Empregados Indiretos']!=null) lines.push(`Indiretos: ${r._raw['Empregados Indiretos']}`);
    return lines.join('<br>');
  }

  function getLat(r){ return normNum(r._raw['Lat'] ?? r._raw['Latitude'] ?? r._raw['LAT'] ?? r._raw['lat'] ?? r._raw['Y'] ?? r._raw['y']); }
  function getLng(r){ return normNum(r._raw['Lng'] ?? r._raw['Long'] ?? r._raw['Longitude'] ?? r._raw['LON'] ?? r._raw['lon'] ?? r._raw['X'] ?? r._raw['x']); }

  function renderMarkers(rows){
    const m = ensureMap();
    if (layer) { m.removeLayer(layer); layer = null; }
    const markers = [];
    rows.forEach(r => {
      const lat = getLat(r); const lng = getLng(r);
      if (lat!=null && lng!=null){
        const mk = L.circleMarker([lat, lng], { radius: 8, color:'#7c3aed', weight:2, fillColor:'#7c3aed', fillOpacity:.6 });
        mk.bindTooltip(tooltipHtml(r), {direction:'top', opacity:.9, sticky:true});
        markers.push(mk);
      }
    });
    layer = L.layerGroup(markers).addTo(m);
    if (markers.length){
      const grp = L.featureGroup(markers);
      m.fitBounds(grp.getBounds().pad(0.2));
    }else{
      // fallback para Nova Lima/MG
      m.setView([-19.985, -43.85], 11);
    }
  }

  // API pública
  window._map = { render: renderMarkers };
})();
