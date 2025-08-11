// app.js — core dashboard, state, utils, router, import/export, dialogs
const Util = {
  todayISO: () => new Date().toISOString().slice(0, 10),
  parseDate: (s) => new Date(s + 'T00:00:00'),
  fmtDate: (d) =>
    new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' }).format(
      d
    ),
  daysDiff: (a, b) => Math.round((a - b) / 86400000),
  clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
  startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  },
  avg: (a) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0),
  movingAvg(arr, n) {
    return arr.map((_, i) => Util.avg(arr.slice(Math.max(0, i - n + 1), i + 1)));
  },
  shortId: (id) => id.slice(0, 4).toUpperCase(),
  escapeHTML(str = '') {
    return str.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  },
  uniq(arr) {
    return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  },
};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const foo = { bar: 'baz' };

const STORAGE_KEY = 'carpool-fleet-v2';
const makeId = () => Math.random().toString(36).slice(2, 8);
const shiftISO = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
function genUtilization() {
  const arr = [];
  let base = 45 + Math.random() * 10;
  for (let i = 0; i < 30; i++) {
    base += Math.random() * 6 - 3;
    arr.push(Util.clamp(Math.round(base), 15, 95));
  }
  return arr;
}

const defaultData = {
  version: 2,
  vehicles: [
    {
      id: makeId(),
      plate: 'ABC123',
      model: 'Volvo XC40 Recharge',
      energy: 'EV',
      soc: 82,
      aux12v: 12.6,
      status: 'Available',
      health: 'OK',
      city: 'Malung',
      pool: 'Depot A',
      location: 'Depot A (Malung)',
      notes: 'Winter kit ready',
    },
    {
      id: makeId(),
      plate: 'XYZ789',
      model: 'VW ID.4',
      energy: 'EV',
      soc: 38,
      aux12v: 12.5,
      status: 'Reserved',
      health: 'OK',
      city: 'Gothenburg',
      pool: 'Depot B',
      location: 'Depot B (Gothenburg)',
      notes: '',
    },
    {
      id: makeId(),
      plate: 'JON555',
      model: 'Toyota Corolla',
      energy: 'Gasoline',
      soc: 64,
      aux12v: 12.7,
      status: 'In Use',
      health: 'OK',
      city: 'Stockholm',
      pool: 'On route',
      location: 'On route',
      notes: 'Booked until Fri',
    },
    {
      id: makeId(),
      plate: 'ECO222',
      model: 'Kia Niro PHEV',
      energy: 'Hybrid',
      soc: 22,
      aux12v: 12.3,
      status: 'Available',
      health: 'Maintenance Due',
      city: 'Falun',
      pool: 'Workshop',
      location: 'Workshop',
      notes: 'Brake pads',
    },
    {
      id: makeId(),
      plate: 'EVL777',
      model: 'Tesla Model 3',
      energy: 'EV',
      soc: 95,
      aux12v: 12.8,
      status: 'Available',
      health: 'OK',
      city: 'Umeå',
      pool: 'Depot C',
      location: 'Depot C (Umeå)',
      notes: 'Autopilot enabled',
    },
    {
      id: makeId(),
      plate: 'DIZ444',
      model: 'VW Transporter',
      energy: 'Diesel',
      soc: 51,
      aux12v: 12.6,
      status: 'Maintenance',
      health: 'Critical',
      city: 'Karlstad',
      pool: 'Garage',
      location: 'Garage',
      notes: 'Check EGR',
    },
  ],
  deliveries: [
    {
      id: makeId(),
      date: shiftISO(-2),
      vehiclePlate: 'JON555',
      route: 'Stockholm → Västerås',
      driver: 'O. Svensson',
      status: 'Completed',
      notes: '',
    },
    {
      id: makeId(),
      date: shiftISO(0),
      vehiclePlate: 'XYZ789',
      route: 'Gothenburg → Malmö',
      driver: 'M. Nilsson',
      status: 'Scheduled',
      notes: 'Morning pickup',
    },
    {
      id: makeId(),
      date: shiftISO(1),
      vehiclePlate: 'EVL777',
      route: 'Umeå → Skellefteå',
      driver: 'A. Virtanen',
      status: 'Scheduled',
      notes: '',
    },
    {
      id: makeId(),
      date: shiftISO(4),
      vehiclePlate: 'ABC123',
      route: 'Falun → Malung',
      driver: 'Maria',
      status: 'Scheduled',
      notes: 'VIP client',
    },
    {
      id: makeId(),
      date: shiftISO(-5),
      vehiclePlate: 'JON555',
      route: 'Karlstad → Örebro',
      driver: 'J. Karlsson',
      status: 'Completed',
      notes: '',
    },
  ],
  utilization: genUtilization(),
};

function validateImport(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Invalid file');
  obj.version ??= 2;
  obj.utilization ??= genUtilization();
  obj.vehicles = Array.isArray(obj.vehicles) ? obj.vehicles : [];
  obj.deliveries = Array.isArray(obj.deliveries) ? obj.deliveries : [];
  for (const v of obj.vehicles) {
    v.soc = Number.isFinite(v.soc)
      ? Util.clamp(Number(v.soc), 0, 100)
      : Util.clamp(Number(v.level ?? 100), 0, 100);
    v.aux12v = Number.isFinite(v.aux12v) ? Number(v.aux12v) : 12.6;
    v.city ??= '';
    v.pool ??= '';
    delete v.level;
  }
  return obj;
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultData));
    return validateImport(JSON.parse(raw));
  } catch {
    return JSON.parse(JSON.stringify(defaultData));
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(App.State.DB));
}

const UI = {
  badge(text, tone = '') {
    let cls = 'badge';
    if (tone === 'ok') cls += ' ok';
    else if (tone === 'warn') cls += ' warn';
    else if (tone === 'bad') cls += ' bad';
    return `<span class="${cls}">${Util.escapeHTML(text)}</span>`;
  },
  energyIcon(t) {
    return { EV: '🔌', Hybrid: '♻️', Gasoline: '⛽', Diesel: '🛢️' }[t] || '🚗';
  },
  statusTone(s) {
    if (s === 'Available' || s === 'Completed') return 'ok';
    if (s === 'Scheduled' || s === 'Reserved') return 'warn';
    return 'bad';
  },
  emptyRow(cols) {
    return `<tr><td class="sub" colspan="${cols}">No records</td></tr>`;
  },
  computeKPIs() {
    const { DB } = App.State;
    const total = DB.vehicles.length;
    const available = DB.vehicles.filter(
      (v) => v.status === 'Available' && v.health === 'OK' && v.soc >= 40
    ).length;
    const needs = DB.vehicles.filter(
      (v) => v.health !== 'OK' || v.soc < 20 || v.status === 'Maintenance'
    ).length;
    const now = Util.startOfDay(new Date());
    const upcoming7 = DB.deliveries.filter((d) => {
      const dd = Util.parseDate(d.date);
      const diff = Util.daysDiff(dd, now);
      return diff >= 0 && diff <= 7;
    }).length;

    $('[data-kpi="totalVehicles"]').textContent = total;
    $('[data-kpi="availableNow"]').textContent = available;
    $('[data-kpi="upcomingDeliveries"]').textContent = upcoming7;
    $('[data-kpi="needsAttention"]').textContent = needs;
    $('[data-kpi="availablePct"]').textContent = total
      ? Math.round((available / total) * 100) + '% ready'
      : '—';

    const next = DB.deliveries
      .map((d) => ({ d, dt: Util.parseDate(d.date) }))
      .filter((x) => Util.daysDiff(x.dt, now) >= 0)
      .sort((a, b) => a.dt - b.dt)[0];
    $('[data-kpi="nextDelivery"]').textContent = next
      ? 'Next: ' + Util.fmtDate(next.dt)
      : 'No upcoming';

    const last = DB.utilization.at(-1) ?? 0;
    const weekAvg = Util.avg(DB.utilization.slice(-7));
    const diff = Math.round(last - weekAvg);
    const trend = diff === 0 ? 'stable' : (diff > 0 ? '+' + diff : diff) + '% vs 7‑day';
    $('[data-kpi="utilTrend"]').textContent = `Util ${last}% (${trend})`;
  },
  drawSparkline() {
    const canvas = $('#utilSpark');
    const ctx = canvas.getContext('2d');
    const W = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const H = (canvas.height = canvas.clientHeight * devicePixelRatio);
    const data = App.State.DB.utilization.slice(-30);
    const max = Math.max(...data, 100),
      min = Math.min(...data, 0);
    const pad = 10 * devicePixelRatio,
      step = (W - pad * 2) / (data.length - 1);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad + i * step;
      const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim();
    ctx.stroke();
    const ma = Util.movingAvg(data, 7);
    ctx.beginPath();
    ma.forEach((v, i) => {
      const x = pad + i * step;
      const y = H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ok').trim();
    ctx.setLineDash([4 * devicePixelRatio, 4 * devicePixelRatio]);
    ctx.stroke();
    ctx.setLineDash([]);
  },
  renderDeliveries() {
    const now = Util.startOfDay(new Date());
    const rows = App.State.DB.deliveries
      .map((d) => ({ ...d, dt: Util.parseDate(d.date) }))
      .sort((a, b) => a.dt - b.dt);
    const future = rows.filter((r) => Util.daysDiff(r.dt, now) >= 0);
    const past = rows.filter((r) => Util.daysDiff(r.dt, now) < 0);

    const filter7 = (arr, dir) =>
      dir === 'future'
        ? arr.filter((r) => Util.daysDiff(r.dt, now) <= 7)
        : arr.filter((r) => Util.daysDiff(r.dt, now) >= -7);

    const up = App.State.flags.upcoming7 ? filter7(future, 'future') : future;
    const re = App.State.flags.recent7 ? filter7(past, 'past').reverse() : [...past].reverse();

    const row = (d) => {
      const tone = UI.statusTone(d.status);
      return `<tr>
        <td>${Util.fmtDate(d.dt)}<div class="sub">${d.date}</div></td>
        <td>${Util.escapeHTML(d.vehiclePlate)}</td>
        <td>${Util.escapeHTML(d.route)}</td>
        <td>${Util.escapeHTML(d.driver)}</td>
        <td>${UI.badge(d.status, tone)}</td>
        <td class="row-actions">
          <button class="mini" data-action="set-delivery-status" data-id="${
            d.id
          }" data-val="Dispatched">Dispatch</button>
          <button class="mini" data-action="set-delivery-status" data-id="${
            d.id
          }" data-val="Completed">Complete</button>
          <button class="mini" data-action="edit-delivery" data-id="${d.id}">Edit</button>
          <button class="mini" data-action="delete-delivery" data-id="${d.id}">Delete</button>
        </td>
      </tr>`;
    };

    $('#upcomingBody').innerHTML = up.map(row).join('') || UI.emptyRow(6);
    $('#recentBody').innerHTML = re.map(row).join('') || UI.emptyRow(6);
  },
  renderAvailable() {
    const rows = App.State.DB.vehicles
      .filter((v) => v.status === 'Available' && v.health === 'OK' && v.soc >= 40)
      .sort((a, b) => b.soc - a.soc)
      .map(
        (v) => `<tr>
        <td>${Util.shortId(v.id)}</td>
        <td><strong>${Util.escapeHTML(v.plate)}</strong></td>
        <td>${Util.escapeHTML(v.model)}</td>
        <td>${UI.energyIcon(v.energy)} ${Util.escapeHTML(v.energy)}</td>
        <td>${v.soc}%</td>
        <td>${UI.badge(v.status, 'ok')}</td>
        <td>${Util.escapeHTML(v.location || '')}</td>
        <td class="row-actions">
          <button class="mini" data-action="dispatch" data-id="${v.id}">Dispatch</button>
          <button class="mini" data-action="edit-vehicle" data-id="${v.id}">Edit</button>
        </td>
      </tr>`
      );
    $('#availableBody').innerHTML = rows.join('') || UI.emptyRow(8);
  },
  filterTables(q) {
    ['#availableBody tr', '#upcomingBody tr', '#recentBody tr'].forEach((sel) => {
      $$(sel).forEach((tr) => {
        const text = tr.innerText.toLowerCase();
        tr.classList.toggle('hide', q && !text.includes(q));
      });
    });
  },
  buildFleetOptions() {
    // this is called on first load; fleet module may also call it after import
    const DB = App.State.DB;
    const cities = Util.uniq(DB.vehicles.map((v) => v.city));
    const pools = Util.uniq(DB.vehicles.map((v) => v.pool));
    const $city = $('#fltCity'),
      $pool = $('#fltPool');
    if (!$city || !$pool) return; // not on this page yet
    [$city, $pool].forEach(
      (sel) => (sel.innerHTML = `<option value="">${sel === $city ? 'City' : 'Pool'}</option>`)
    );
    cities.forEach((c) => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      $city.appendChild(o);
    });
    pools.forEach((p) => {
      const o = document.createElement('option');
      o.value = p;
      o.textContent = p;
      $pool.appendChild(o);
    });
  },
};

const App = {
  State: {
    DB: load(),
    sort: { col: null, dir: 1 },
    flags: { upcoming7: true, recent7: true },
    route: '#/dashboard',
  },
  UI,
  Util,
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(App.State.DB));
}

const Toast = {
  show(msg, tone = '') {
    const t = document.createElement('div');
    t.textContent = msg;
    t.role = 'status';
    Object.assign(t.style, {
      position: 'fixed',
      bottom: '18px',
      right: '18px',
      background: 'var(--card)',
      border: '1px solid var(--border)',
      padding: '10px 12px',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(0,0,0,.23)',
      zIndex: 9999,
      pointerEvents: 'none',
    });
    if (tone === 'ok') t.style.borderColor = 'rgba(22,163,74,.35)';
    if (tone === 'bad') t.style.borderColor = 'rgba(220,38,38,.35)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  },
};

const Controller = {
  applySort(col, dir) {
    App.State.sort.col = col;
    App.State.sort.dir = dir;
    const cmp = (a, b) => {
      const av = a[col];
      const bv = b[col];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return (
        String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) *
        dir
      );
    };
    App.State.DB.vehicles = [...App.State.DB.vehicles].sort(cmp);
    UI.renderAvailable();
    if (window.Fleet && window.Fleet.renderFleet) window.Fleet.renderFleet(App);
  },
  onTableSort() {
    $$('.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        const dir = App.State.sort.col === col ? -App.State.sort.dir : 1;
        Controller.applySort(col, dir);
        $$('.sortable .dir').forEach((s) => (s.textContent = '↕'));
        $('.dir', th).textContent = dir > 0 ? '↑' : '↓';
      });
    });
  },
  actionsHandler(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === 'dispatch' || action === 'return') {
      const v = App.State.DB.vehicles.find((x) => x.id === id);
      if (!v) return;
      if (action === 'dispatch') {
        v.status = 'In Use';
        v.soc = Util.clamp((v.soc ?? 0) - 5, 0, 100);
        Toast.show(`Dispatched ${v.plate}`);
      } else {
        v.status = 'Available';
        v.soc = Util.clamp((v.soc ?? 0) + 10, 0, 100);
        Toast.show(`Returned ${v.plate}`);
      }
      saveState();
      refresh();
    }
    if (action === 'edit-vehicle') {
      Dialogs.openVehicle(App.State.DB.vehicles.find((x) => x.id === id));
    }
    if (action === 'delete-vehicle') {
      if (confirm('Delete this vehicle?')) {
        App.State.DB.vehicles = App.State.DB.vehicles.filter((x) => x.id !== id);
        saveState();
        refresh();
      }
    }
    if (action === 'set-delivery-status') {
      const d = App.State.DB.deliveries.find((x) => x.id === id);
      if (!d) return;
      d.status = btn.dataset.val;
      Toast.show(`Delivery ${d.status.toLowerCase()}`);
      saveState();
      refresh();
    }
    if (action === 'edit-delivery') {
      Dialogs.openDelivery(App.State.DB.deliveries.find((x) => x.id === id));
    }
    if (action === 'delete-delivery') {
      if (confirm('Delete this delivery?')) {
        App.State.DB.deliveries = App.State.DB.deliveries.filter((x) => x.id !== id);
        saveState();
        refresh();
      }
    }
  },
  deliveryToggles() {
    $('#btnAllUpcoming')?.addEventListener('click', () => {
      App.State.flags.upcoming7 = !App.State.flags.upcoming7;
      UI.renderDeliveries();
      $('#btnAllUpcoming').textContent = App.State.flags.upcoming7 ? 'All' : '7d';
    });
    $('#btnAllRecent')?.addEventListener('click', () => {
      App.State.flags.recent7 = !App.State.flags.recent7;
      UI.renderDeliveries();
      $('#btnAllRecent').textContent = App.State.flags.recent7 ? 'All' : '7d';
    });
  },
  globalSearch() {
    const input = $('#globalSearch');
    input?.addEventListener('input', () => UI.filterTables(input.value.trim().toLowerCase()));
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input) {
        e.preventDefault();
        input?.focus();
      }
    });
  },
  router() {
    function paintRoute() {
      const hash = location.hash || '#/dashboard';
      const isFleet = hash === '#/fleet';
      $('#page-dashboard').classList.toggle('hide', isFleet);
      $('#page-fleet').classList.toggle('hide', !isFleet);
      $('#tab-dashboard')?.setAttribute('aria-current', isFleet ? 'false' : 'page');
      $('#tab-fleet')?.setAttribute('aria-current', isFleet ? 'page' : 'false');
      if (isFleet) ensureFleetLoaded();
    }
    window.addEventListener('hashchange', paintRoute);
    $('#tab-dashboard')?.addEventListener('click', (e) => {
      e.preventDefault();
      location.hash = '#/dashboard';
    });
    $('#tab-fleet')?.addEventListener('click', (e) => {
      e.preventDefault();
      location.hash = '#/fleet';
    });
    paintRoute();
  },
};

async function ensureFleetLoaded() {
  if (!window.Fleet) {
    window.Fleet = await import('./fleet.js');
  }
  window.Fleet.mountFleet(App);
}

const Dialogs = {
  openVehicle(v = null) {
    $('#vehicleDialogTitle').textContent = v ? 'Edit Vehicle' : 'Add Vehicle';
    $('#vehId').value = v?.id || '';
    $('#vehPlate').value = v?.plate || '';
    $('#vehModel').value = v?.model || '';
    $('#vehEnergy').value = v?.energy || 'EV';
    $('#vehSOC').value = v?.soc ?? 100;
    $('#veh12v').value = v?.aux12v ?? 12.6;
    $('#vehStatus').value = v?.status || 'Available';
    $('#vehHealth').value = v?.health || 'OK';
    $('#vehCity').value = v?.city || '';
    $('#vehPool').value = v?.pool || '';
    $('#vehLocation').value = v?.location || '';
    $('#vehNotes').value = v?.notes || '';
    $('#vehicleDialog').showModal();
  },
  saveVehicle(e) {
    e.preventDefault();
    const data = {
      id: $('#vehId').value || makeId(),
      plate: $('#vehPlate').value.trim(),
      model: $('#vehModel').value.trim(),
      energy: $('#vehEnergy').value,
      soc: Util.clamp(parseInt($('#vehSOC').value || '0', 10), 0, 100),
      aux12v: Number($('#veh12v').value || '0'),
      status: $('#vehStatus').value,
      health: $('#vehHealth').value,
      city: $('#vehCity').value.trim(),
      pool: $('#vehPool').value.trim(),
      location: $('#vehLocation').value.trim(),
      notes: $('#vehNotes').value.trim(),
    };
    if (!data.plate || !data.model) {
      Toast.show('Plate and Model are required', 'bad');
      return;
    }
    const idx = App.State.DB.vehicles.findIndex((v) => v.id === data.id);
    if (idx >= 0) App.State.DB.vehicles[idx] = data;
    else App.State.DB.vehicles.unshift(data);
    saveState();
    $('#vehicleDialog').close();
    refresh();
    UI.buildFleetOptions();
  },
  openDelivery(d = null) {
    $('#deliveryDialogTitle').textContent = d ? 'Edit Delivery' : 'Add Delivery';
    $('#delivId').value = d?.id || '';
    $('#delivDate').value = d?.date || Util.todayISO();
    $('#delivDriver').value = d?.driver || '';
    $('#delivRoute').value = d?.route || '';
    const sel = $('#delivVehicle');
    sel.innerHTML = '';
    App.State.DB.vehicles.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.plate;
      opt.textContent = `${v.plate} — ${v.model}`;
      if (d?.vehiclePlate === v.plate) opt.selected = true;
      sel.appendChild(opt);
    });
    $('#delivStatus').value = d?.status || 'Scheduled';
    $('#delivNotes').value = d?.notes || '';
    $('#deliveryDialog').showModal();
  },
  saveDelivery(e) {
    e.preventDefault();
    const data = {
      id: $('#delivId').value || makeId(),
      date: $('#delivDate').value,
      driver: $('#delivDriver').value.trim(),
      route: $('#delivRoute').value.trim(),
      vehiclePlate: $('#delivVehicle').value,
      status: $('#delivStatus').value,
      notes: $('#delivNotes').value.trim(),
    };
    if (!data.date || !data.driver || !data.route || !data.vehiclePlate) {
      Toast.show('Please fill in all required fields', 'bad');
      return;
    }
    const idx = App.State.DB.deliveries.findIndex((x) => x.id === data.id);
    if (idx >= 0) App.State.DB.deliveries[idx] = data;
    else App.State.DB.deliveries.unshift(data);
    saveState();
    $('#deliveryDialog').close();
    refresh();
  },
};

function refresh() {
  UI.computeKPIs();
  UI.drawSparkline();
  UI.renderDeliveries();
  UI.renderAvailable();
  UI.filterTables($('#globalSearch')?.value.trim().toLowerCase() || '');
  // if fleet mounted, ask it to re-render
  if (window.Fleet && window.Fleet.renderFleet) window.Fleet.renderFleet(App);
}

function mount() {
  window.addEventListener('resize', UI.drawSparkline);
  document.addEventListener('DOMContentLoaded', () => {
    refresh();
    UI.buildFleetOptions();
    Controller.router();
  });
  $('#addVehicleBtn')?.addEventListener('click', () => Dialogs.openVehicle());
  $('#saveVehicle')?.addEventListener('click', Dialogs.saveVehicle);
  $('#addDeliveryBtn')?.addEventListener('click', () => Dialogs.openDelivery());
  $('#saveDelivery')?.addEventListener('click', Dialogs.saveDelivery);
  $('#exportBtn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(App.State.DB, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carpool-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#importInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = validateImport(JSON.parse(text));
      if (!obj.vehicles || !obj.deliveries) throw new Error('Invalid file');
      App.State.DB = obj;
      saveState();
      refresh();
      UI.buildFleetOptions();
      Toast.show('Import complete', 'ok');
    } catch (err) {
      Toast.show('Failed to import: ' + err.message, 'bad');
    } finally {
      e.target.value = '';
    }
  });
  Controller.onTableSort();
  document.addEventListener('click', Controller.actionsHandler);
  Controller.deliveryToggles();
  Controller.globalSearch();
}
mount();
export { App, UI, Util };

/* ===== Import validation wiring ===== */
(function () {
  const input = document.getElementById("importInput");
  if (!input) return;

  // Avoid duplicate listeners (Live Server reloads)
  const clone = input.cloneNode(true);
  input.parentNode.replaceChild(clone, input);

  clone.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (err) {
        showImportReport({ ok: false, errors: ["Invalid JSON: " + err.message], warnings: [] });
        return;
      }
      const { validateImport } = await import("./import-validator.js");
      const res = validateImport(parsed);
      showImportReport(res);
      if (res.ok && res.data) {
        // adopt data if your app exposes DB/save/refresh
        if (typeof window.DB !== "undefined") window.DB = res.data;
        if (typeof save === "function") save();
        if (typeof refresh === "function") refresh();
      }
    } catch (err) {
      showImportReport({ ok: false, errors: ["Import failed: " + err.message], warnings: [] });
    } finally {
      e.target.value = "";
    }
  });
})();

function showImportReport(res) {
  const dlg = document.getElementById("importReport");
  const enc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;", "\"":"&quot;","'":"&#39;" }[c]));
  if (!dlg) {
    if (res.ok) {
      alert(`Import OK: ${res.data?.vehicles?.length || 0} vehicles, ${res.data?.deliveries?.length || 0} deliveries.` +
        (res.warnings?.length ? `\nWarnings:\n- ${res.warnings.slice(0,10).join("\n- ")}` : ""));
    } else {
      alert("Import failed:\n- " + res.errors.slice(0,10).join("\n- "));
    }
    return;
  }
  const sum = document.getElementById("importSummary");
  const wList = document.getElementById("importWarnings");
  const eList = document.getElementById("importErrors");
  const wWrap = document.getElementById("importWarningsWrap");
  const eWrap = document.getElementById("importErrorsWrap");

  sum.textContent = res.ok
    ? `Import OK: ${res.data?.vehicles?.length || 0} vehicles, ${res.data?.deliveries?.length || 0} deliveries.`
    : "Import failed � no data was applied.";

  wList.innerHTML = (res.warnings || []).slice(0,100).map(s => `<li>${enc(s)}</li>`).join("");
  eList.innerHTML = (res.errors || []).slice(0,100).map(s => `<li>${enc(s)}</li>`).join("");
  wWrap.classList.toggle("hide", !(res.warnings && res.warnings.length));
  eWrap.classList.toggle("hide", !(res.errors && res.errors.length));
  dlg.showModal();
}
