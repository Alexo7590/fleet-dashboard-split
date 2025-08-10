
// fleet.js — lazy-loaded Full Fleet with pagination
function mountFleet(App){
  const { Util, UI } = App;
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));
  if(!$('#page-fleet')) return;

  // Fleet local state
  if(!App.State.fleet){
    App.State.fleet = { text:'', city:'', pool:'', energy:'', status:'', health:'', socMin:0, v12Min:0, hideMaint:false, hideLow:false, hideUnavailable:false, page:1, pageSize:50 };
  }

  function readFilters(){
    const f = App.State.fleet;
    const get = id => $(id);
    f.text = get('#fltText')?.value.trim() || '';
    f.city = get('#fltCity')?.value || '';
    f.pool = get('#fltPool')?.value || '';
    f.energy = get('#fltEnergy')?.value || '';
    f.status = get('#fltStatus')?.value || '';
    f.health = get('#fltHealth')?.value || '';
    f.socMin = Number(get('#fltSocMin')?.value || 0);
    f.v12Min = Number(get('#flt12vMin')?.value || 0);
    f.hideMaint = !!get('#fltHideMaint')?.checked;
    f.hideLow = !!get('#fltHideLow')?.checked;
    f.hideUnavailable = !!get('#fltHideUnavailable')?.checked;
    f.pageSize = Number(get('#pageSize')?.value || 50);
  }

  function filtered(){
    readFilters();
    const f = App.State.fleet;
    let list = [...App.State.DB.vehicles];
    if(f.text){ const q=f.text.toLowerCase(); list = list.filter(v=> (v.plate+v.model+v.notes+v.location).toLowerCase().includes(q)); }
    if(f.city)   list = list.filter(v=> v.city===f.city);
    if(f.pool)   list = list.filter(v=> v.pool===f.pool);
    if(f.energy) list = list.filter(v=> v.energy===f.energy);
    if(f.status) list = list.filter(v=> v.status===f.status);
    if(f.health) list = list.filter(v=> v.health===f.health);
    list = list.filter(v=> (v.soc??0) >= (f.socMin||0));
    list = list.filter(v=> (v.aux12v??0) >= (f.v12Min||0));
    if(f.hideMaint) list = list.filter(v=> v.health==='OK' && v.status!=='Maintenance');
    if(f.hideLow) list = list.filter(v=> v.soc>=20);
    if(f.hideUnavailable) list = list.filter(v=> v.status==='Available');
    return list;
  }

  function paginate(list){
    const f = App.State.fleet;
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / f.pageSize));
    if(f.page > pages) f.page = pages;
    const start = (f.page - 1) * f.pageSize;
    const end = start + f.pageSize;
    return { total, pages, slice: list.slice(start, end) };
  }

  function renderFleet(){
    const list = filtered();
    const { total, pages, slice } = paginate(list);
    const $body = $('#fleetBody');
    const $count = $('#fleetCount');
    const $pageInfo = $('#pageInfo');
    if($count) $count.textContent = `${total} vehicles • page ${App.State.fleet.page} of ${pages}`;
    if($pageInfo) $pageInfo.textContent = `${App.State.fleet.page} / ${pages}`;

    const rows = slice.map(v=>{
      const healthTone = v.health==='OK' ? 'ok' : (v.health==='Maintenance Due' ? 'warn' : 'bad');
      const statusCls = UI.statusTone(v.status);
      const socTone = v.soc>=60 ? 'ok' : (v.soc>=20? 'warn':'bad');
      return `<tr data-plate="${Util.escapeHTML(v.plate)}" data-model="${Util.escapeHTML(v.model)}" data-location="${Util.escapeHTML(v.location||'')}">
        <td>${Util.shortId(v.id)}</td>
        <td><strong>${Util.escapeHTML(v.plate)}</strong></td>
        <td>${Util.escapeHTML(v.model)}</td>
        <td>${UI.energyIcon(v.energy)} ${Util.escapeHTML(v.energy)}</td>
        <td>${UI.badge((v.soc??0)+'%', socTone)}</td>
        <td>${(v.aux12v??'-')}</td>
        <td>${UI.badge(v.status, statusCls)}</td>
        <td>${UI.badge(v.health, healthTone)}</td>
        <td>${Util.escapeHTML(v.city||'')}</td>
        <td>${Util.escapeHTML(v.pool||'')}</td>
        <td>${Util.escapeHTML(v.location||'')}</td>
        <td>${Util.escapeHTML(v.notes||'')}</td>
        <td class="row-actions">
          <button class="mini" data-action="dispatch" data-id="${v.id}" ${v.status!=='Available'?'disabled':''}>Dispatch</button>
          <button class="mini" data-action="return" data-id="${v.id}" ${v.status==='Available'?'disabled':''}>Return</button>
          <button class="mini" data-action="edit-vehicle" data-id="${v.id}">Edit</button>
          <button class="mini" data-action="delete-vehicle" data-id="${v.id}">Delete</button>
        </td>
      </tr>`;
    });
    $body.innerHTML = rows.join('') || UI.emptyRow(13);
  }

  function wireFilters(){
    ['#fltText','#fltCity','#fltPool','#fltEnergy','#fltStatus','#fltHealth','#fltSocMin','#flt12vMin','#pageSize']
      .forEach(id=> $(id)?.addEventListener('input', ()=>{ App.State.fleet.page=1; renderFleet(); }));
    ['#fltHideMaint','#fltHideLow','#fltHideUnavailable']
      .forEach(id=> $(id)?.addEventListener('change', ()=>{ App.State.fleet.page=1; renderFleet(); }));
    $('#fltClear')?.addEventListener('click', ()=>{
      ['fltText','fltCity','fltPool','fltEnergy','fltStatus','fltHealth','fltSocMin','flt12vMin'].forEach(id=>{ const el=$('#'+id); if(!el) return; if(el.tagName==='SELECT') el.value=''; else el.value=''; });
      ['fltHideMaint','fltHideLow','fltHideUnavailable'].forEach(id=>{ const el=$('#'+id); if(el) el.checked=false; });
      App.State.fleet.page=1; renderFleet();
    });
  }

  function wirePager(){
    $('#prevPage')?.addEventListener('click', ()=>{ if(App.State.fleet.page>1){ App.State.fleet.page--; renderFleet(); } });
    $('#nextPage')?.addEventListener('click', ()=>{
      const list = filtered(); const pages = Math.max(1, Math.ceil(list.length / App.State.fleet.pageSize));
      if(App.State.fleet.page < pages){ App.State.fleet.page++; renderFleet(); }
    });
  }

  // initial populate city/pool options
  const cities = Util.uniq(App.State.DB.vehicles.map(v=>v.city));
  const pools  = Util.uniq(App.State.DB.vehicles.map(v=>v.pool));
  const $city=$('#fltCity'), $pool=$('#fltPool');
  if($city && $pool){
    [$city,$pool].forEach(sel=> sel.innerHTML = `<option value="">${sel===$city?'City':'Pool'}</option>`);
    cities.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; $city.appendChild(o); });
    pools.forEach(p=>{ const o=document.createElement('option'); o.value=p; o.textContent=p; $pool.appendChild(o); });
  }

  wireFilters();
  wirePager();
  renderFleet();

  // Expose renderer so core can call after global changes
  window.Fleet.renderFleet = renderFleet;
}

export { mountFleet };
