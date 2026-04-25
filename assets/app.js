// Alyame Travel & Tourism — Attendance System
// Backend: Supabase | Maps: Leaflet + OSM
(function(){
const SB_URL = 'https://nzuffplbcgzkhqbjenik.supabase.co';
const SB_KEY = 'sb_publishable_U81gIoQfLsWz45QNjf8PZg_TL0EDbeF';
const LS_USER='alyame_sess', LS_LANG='alyame_lang';

// ============= Supabase REST client (no SDK needed) =============
async function sb(path, opts={}){
  const url = `${SB_URL}/rest/v1/${path}`;
  const headers = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer '+SB_KEY,
    'Content-Type': 'application/json',
    'Prefer': opts.prefer || 'return=representation',
    ...(opts.headers||{})
  };
  const r = await fetch(url, { method: opts.method||'GET', headers, body: opts.body?JSON.stringify(opts.body):undefined });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`${r.status}: ${err}`);
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// ============= Crypto =============
async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ============= i18n =============
const I18N = {
  ar: {
    'login.title':'نظام حضور اليامي','login.subtitle':'سجّل دخولك بالهاتف ورمز PIN',
    'login.phone':'رقم الهاتف','login.pin':'الرمز السري (PIN)','login.continue':'دخول','login.support':'الدعم',
    'login.fail':'بيانات الدخول غير صحيحة','login.fillAll':'الرجاء تعبئة الحقول',
    'login.ctx.title':'جاهزية الجولات','login.ctx.desc':'تحقق تلقائي عبر GPS',
    'role.agent':'موظف حجوزات','role.guide':'مرشد سياحي','role.manager':'مدير','role.driver':'سائق',
    'loc.pending':'جاري تحديد الموقع...','verify.ok':'✓ تم التحقق من الموقع','verify.fail':'تعذّر تحديد الموقع',
    'hint.in':'اضغط لبدء نوبة عملك','hint.out':'اضغط لإنهاء نوبتك',
    'clock.in':'تسجيل الحضور','clock.out':'تسجيل الانصراف',
    'stat.hours':'ساعات العمل','stat.goal':'الهدف: ٨س','stat.last':'آخر حضور','stat.offline':'غير متصل','stat.online':'نشط الآن',
    'dash.live':'الموقع المباشر','dash.tracking':'تتبع مباشر','dash.recent':'النشاط الأخير','dash.empty':'لا يوجد نشاط بعد',
    'log.start':'بداية المناوبة','log.end':'نهاية المناوبة','log.verified':'محقق','log.ongoing':'جارٍ','log.onsite':'في الموقع',
    'history.title':'سجل الحضور','history.sub':'مراجعة سجلات الحضور والمواقع',
    'history.week':'آخر ٧ أيام','history.month':'هذا الشهر','history.all':'الكل','history.export':'تصدير CSV','history.empty':'لا توجد سجلات',
    'history.ontime':'في الموعد','history.late':'متأخر','history.details':'تفاصيل',
    'nav.home':'الرئيسية','nav.history':'السجل','nav.admin':'الإدارة','nav.logout':'خروج',
    'admin.title':'لوحة الإدارة','admin.employees':'الموظفون','admin.logs':'السجلات','admin.livemap':'خريطة حية','admin.stats':'الإحصائيات',
    'admin.addEmp':'إضافة موظف','admin.name':'الاسم','admin.phone':'الهاتف','admin.role':'الدور','admin.branch':'الفرع','admin.pin':'الرمز السري',
    'admin.isAdmin':'مدير','admin.active':'نشط','admin.save':'حفظ','admin.cancel':'إلغاء','admin.delete':'حذف','admin.edit':'تعديل',
    'admin.totalEmp':'إجمالي الموظفين','admin.activeNow':'نشط الآن','admin.todayLogs':'سجلات اليوم','admin.totalHours':'ساعات اليوم',
    'admin.confirmDel':'حذف هذا الموظف؟','admin.empty':'لا يوجد موظفون بعد. أضف أول موظف.',
    'toast.in':'تم تسجيل حضورك بنجاح','toast.out':'تم الانصراف. المدة: ','toast.welcome':'أهلاً بك',
    'toast.saved':'تم الحفظ','toast.deleted':'تم الحذف','toast.error':'حدث خطأ',
    'confirm.logout':'تسجيل الخروج؟',
  },
  en: {
    'login.title':'Alyame Attendance','login.subtitle':'Sign in with phone & PIN',
    'login.phone':'Phone','login.pin':'PIN Code','login.continue':'Sign in','login.support':'Support',
    'login.fail':'Invalid credentials','login.fillAll':'Please fill all fields',
    'login.ctx.title':'Tour Ops Ready','login.ctx.desc':'Automatic GPS verification',
    'role.agent':'Booking Agent','role.guide':'Tour Guide','role.manager':'Manager','role.driver':'Driver',
    'loc.pending':'Locating...','verify.ok':'✓ Location verified','verify.fail':'Location unavailable',
    'hint.in':'Tap to start your shift','hint.out':'Tap to end your shift',
    'clock.in':'Check In','clock.out':'Check Out',
    'stat.hours':'Work Hours','stat.goal':'Goal: 8h','stat.last':'Last Check-in','stat.offline':'Offline','stat.online':'Active now',
    'dash.live':'Live Location','dash.tracking':'Live Tracking','dash.recent':'Recent Activity','dash.empty':'No activity yet',
    'log.start':'Shift Started','log.end':'Shift Ended','log.verified':'VERIFIED','log.ongoing':'ONGOING','log.onsite':'On-Site',
    'history.title':'Attendance History','history.sub':'Review your logs and locations',
    'history.week':'Last 7 Days','history.month':'This Month','history.all':'All Time','history.export':'Export CSV','history.empty':'No records',
    'history.ontime':'On-Time','history.late':'Late','history.details':'Details',
    'nav.home':'Home','nav.history':'History','nav.admin':'Admin','nav.logout':'Logout',
    'admin.title':'Admin Panel','admin.employees':'Employees','admin.logs':'Logs','admin.livemap':'Live Map','admin.stats':'Stats',
    'admin.addEmp':'Add Employee','admin.name':'Name','admin.phone':'Phone','admin.role':'Role','admin.branch':'Branch','admin.pin':'PIN',
    'admin.isAdmin':'Admin','admin.active':'Active','admin.save':'Save','admin.cancel':'Cancel','admin.delete':'Delete','admin.edit':'Edit',
    'admin.totalEmp':'Total Employees','admin.activeNow':'Active Now','admin.todayLogs':'Today Logs','admin.totalHours':'Today Hours',
    'admin.confirmDel':'Delete this employee?','admin.empty':'No employees yet. Add your first.',
    'toast.in':'Checked in successfully','toast.out':'Checked out. Duration: ','toast.welcome':'Welcome',
    'toast.saved':'Saved','toast.deleted':'Deleted','toast.error':'Error occurred',
    'confirm.logout':'Log out?',
  }
};

const state = {
  lang: localStorage.getItem(LS_LANG) || 'ar',
  user: JSON.parse(localStorage.getItem(LS_USER) || 'null'),
  currentLog: null,
  location: null
};
function saveSess(){ state.user ? localStorage.setItem(LS_USER, JSON.stringify(state.user)) : localStorage.removeItem(LS_USER); localStorage.setItem(LS_LANG, state.lang); }
function t(k){ return I18N[state.lang][k] ?? k; }

function applyLangDir(){
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang==='ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  document.querySelectorAll('.lang-btn').forEach(b => {
    const a = b.dataset.lang === state.lang;
    b.className = 'lang-btn px-4 py-1.5 rounded-full font-bold text-sm transition ' + (a ? 'bg-white text-primary shadow-sm' : 'text-white hover:bg-white/10');
  });
}

function fmtTime(d){ return new Date(d).toLocaleTimeString(state.lang==='ar'?'ar-LY':'en-US',{hour:'2-digit',minute:'2-digit',hour12:true}); }
function fmtTime24(d){ return new Date(d).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}); }
function fmtDateFull(d){ return new Date(d).toLocaleDateString(state.lang==='ar'?'ar-LY':'en-US',{weekday:'long',day:'numeric',month:'long'}); }
function fmtDur(ms){ const m=Math.max(0,Math.floor(ms/60000)); return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`; }
function initials(n){ if(!n) return 'A'; const p=n.trim().split(/\s+/); return (p[0][0]+(p[1]?.[0]||'')).toUpperCase(); }

function toast(msg, kind='success'){
  let el = document.getElementById('toast');
  if(!el){ el = document.createElement('div'); el.id='toast'; el.className='fixed top-4 inset-x-0 mx-auto max-w-sm z-[200] px-4 hidden'; document.body.appendChild(el); }
  const bg = kind==='error' ? 'bg-error text-white' : kind==='info' ? 'bg-primary text-white' : 'bg-tertiary-container text-white';
  el.innerHTML = `<div class="${bg} px-4 py-3 rounded-2xl shadow-2xl font-semibold text-center" style="animation:slideDown .3s ease-out">${msg}</div>`;
  el.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(()=>el.classList.add('hidden'), 3500);
}

// ============= Location =============
async function getLocation(){
  return new Promise(res => {
    if(!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({lat:p.coords.latitude, lng:p.coords.longitude, accuracy:p.coords.accuracy}),
      () => res(null),
      { enableHighAccuracy:true, timeout:8000, maximumAge:30000 }
    );
  });
}
async function reverse(lat,lng){
  try{
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&accept-language=${state.lang}`);
    const j = await r.json();
    return j.display_name?.split(',').slice(0,2).join(', ') || null;
  }catch{ return null; }
}

// ============= Leaflet helpers =============
function createMap(containerId, center, zoom=15){
  const map = L.map(containerId, { zoomControl: true, attributionControl: false }).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  return map;
}
function pinIcon(color='#00355f', letter='A'){
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="background:${color};width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
             <span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:13px;">${letter}</span>
           </div>`,
    iconSize: [34,34], iconAnchor: [17,34]
  });
}

// ============= Auth =============
function normalizePhone(p){
  if (!p) return '';
  const raw = String(p).trim();
  if (raw.toLowerCase() === 'admin') return 'admin';
  // remove spaces, dashes, parentheses, plus
  let n = raw.replace(/[\s\-\(\)\+]/g,'');
  // strip leading 218 (Libya country code) if present
  if (n.startsWith('218')) n = n.slice(3);
  // strip leading 0 if present
  if (n.startsWith('0')) n = n.slice(1);
  return n;
}

async function login(phone, pin){
  const pin_hash = await sha256(pin);
  const variants = new Set();
  const norm = normalizePhone(phone);
  variants.add(phone.trim());
  variants.add(norm);
  if (norm && norm !== 'admin') {
    variants.add('+218'+norm);
    variants.add('218'+norm);
    variants.add('0'+norm);
  }
  const list = [...variants].filter(Boolean);
  // try each variant
  for (const v of list) {
    const rows = await sb(`att_employees?phone=eq.${encodeURIComponent(v)}&pin_hash=eq.${pin_hash}&active=eq.true`);
    if (rows && rows.length) {
      const u = rows[0];
      state.user = { id: u.id, name: u.name, phone: u.phone, role: u.role, is_admin: u.is_admin, branch: u.branch };
      saveSess();
      return u;
    }
  }
  throw new Error('invalid');
}

async function loadCurrentLog(){
  const r = await sb(`att_logs?employee_id=eq.${state.user.id}&check_out=is.null&order=check_in.desc&limit=1`);
  state.currentLog = r?.[0] || null;
  return state.currentLog;
}

async function checkIn(loc){
  const body = {
    employee_id: state.user.id,
    check_in: new Date().toISOString(),
    lat_in: loc?.lat, lng_in: loc?.lng,
    location_in: loc?.name || null,
    status: 'ongoing'
  };
  const r = await sb('att_logs', { method:'POST', body });
  state.currentLog = r[0];
  return state.currentLog;
}

async function checkOut(loc){
  if (!state.currentLog) return null;
  const end = new Date();
  const inT = new Date(state.currentLog.check_in);
  const mins = Math.floor((end - inT) / 60000);
  const body = {
    check_out: end.toISOString(),
    duration_min: mins,
    lat_out: loc?.lat, lng_out: loc?.lng,
    location_out: loc?.name || null,
    status: 'completed'
  };
  await sb(`att_logs?id=eq.${state.currentLog.id}`, { method:'PATCH', body });
  const done = { ...state.currentLog, ...body };
  state.currentLog = null;
  return done;
}

async function myLogs(limit=50){
  return sb(`att_logs?employee_id=eq.${state.user.id}&order=check_in.desc&limit=${limit}`) || [];
}

// ============= PAGE INITS =============

async function initLogin(){
  if (state.user){ location.href = state.user.is_admin ? 'admin.html' : 'dashboard.html'; return; }
  applyLangDir();
  document.querySelectorAll('.lang-btn').forEach(b => b.onclick = () => { state.lang=b.dataset.lang; saveSess(); applyLangDir(); });
  document.getElementById('login-form').onsubmit = async e => {
    e.preventDefault();
    const phone = document.getElementById('f-phone').value.trim();
    const pin = document.getElementById('f-pin').value.trim();
    if (!phone || !pin) return toast(t('login.fillAll'),'error');
    const btn = document.getElementById('f-submit'); btn.disabled=true; btn.classList.add('opacity-60');
    try {
      const u = await login(phone, pin);
      toast(t('toast.welcome')+' '+u.name,'info');
      setTimeout(()=> location.href = u.is_admin ? 'admin.html' : 'dashboard.html', 500);
    } catch {
      toast(t('login.fail'),'error');
      btn.disabled=false; btn.classList.remove('opacity-60');
    }
  };
}

async function initDashboard(){
  if (!state.user){ location.href='index.html'; return; }
  applyLangDir();
  wireCommon();
  document.getElementById('user-initials').textContent = initials(state.user.name);
  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-role').textContent = t('role.'+state.user.role);
  if (state.user.is_admin) {
    const ab = document.getElementById('admin-btn'); if (ab) ab.classList.remove('hidden');
    const ms = document.getElementById('map-section'); if (ms) ms.classList.remove('hidden');
    const dg = document.getElementById('dash-grid'); if (dg) dg.classList.add('lg:grid','lg:grid-cols-3');
    const dl = document.getElementById('dash-left'); if (dl) dl.classList.add('lg:col-span-2');
  }

  // Live clock
  const tick = () => {
    const d = new Date();
    document.getElementById('live-time').textContent = d.toLocaleTimeString(state.lang==='ar'?'ar-LY':'en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
    document.getElementById('live-date').textContent = fmtDateFull(d);
  };
  tick(); setInterval(tick, 30000);

  // Location + Map
  const locEl = document.getElementById('live-location');
  const verEl = document.getElementById('verify-status');
  locEl.textContent = t('loc.pending');
  await loadCurrentLog();
  const pos = await getLocation();
  let map = null, marker = null;
  const mapEl = document.getElementById('map');
  const mapVisible = mapEl && state.user.is_admin;
  if (pos) {
    state.location = pos;
    const name = await reverse(pos.lat, pos.lng) || `${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`;
    state.location.name = name;
    locEl.textContent = name;
    verEl.innerHTML = `<span class="text-tertiary font-semibold">${t('verify.ok')}</span>`;
    if (mapVisible) {
      map = createMap('map', [pos.lat, pos.lng], 15);
      marker = L.marker([pos.lat, pos.lng], { icon: pinIcon('#00355f', initials(state.user.name)) }).addTo(map);
      L.circle([pos.lat, pos.lng], { radius: pos.accuracy||50, color:'#0f4c81', fillColor:'#8ebdf9', fillOpacity:0.15, weight:1 }).addTo(map);
    }
  } else {
    locEl.textContent = t('verify.fail');
    verEl.innerHTML = `<span class="text-error font-semibold">${t('verify.fail')}</span>`;
    if (mapVisible) mapEl.innerHTML = `<div class="w-full h-full flex items-center justify-center text-outline text-sm">${t('verify.fail')}</div>`;
  }

  // Clock button
  document.getElementById('btn-clock').onclick = async () => {
    const btn = document.getElementById('btn-clock'); btn.disabled=true;
    try {
      if (!state.currentLog) {
        await checkIn(state.location);
        toast(t('toast.in'),'success');
      } else {
        const done = await checkOut(state.location);
        toast(t('toast.out')+fmtDur(done.duration_min*60000),'info');
      }
      await renderDash();
    } catch(e){ toast(t('toast.error'),'error'); }
    btn.disabled=false;
  };

  await renderDash();
  setInterval(renderDash, 60000);
}

async function renderDash(){
  const open = state.currentLog;
  const btn = document.getElementById('btn-clock');
  const icon = document.getElementById('clock-icon');
  const lblAr = document.getElementById('clock-label-ar');
  const lblEn = document.getElementById('clock-label-en');
  const hint = document.getElementById('clock-hint');
  if (open) {
    btn.classList.remove('bg-secondary-container'); btn.classList.add('bg-primary');
    btn.style.boxShadow='0 10px 30px rgba(0,53,95,0.4)';
    icon.textContent = 'logout';
    lblAr.textContent = 'تسجيل الانصراف'; lblEn.textContent = 'Check Out';
    hint.textContent = t('hint.out');
  } else {
    btn.classList.add('bg-secondary-container'); btn.classList.remove('bg-primary');
    btn.style.boxShadow='0 10px 30px rgba(254,125,94,0.4)';
    icon.textContent = 'fingerprint';
    lblAr.textContent = 'تسجيل الحضور'; lblEn.textContent = 'Check In';
    hint.textContent = t('hint.in');
  }

  const logs = await myLogs(20);
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  let todayMs=0, lastIn=null;
  for (const l of logs) {
    const inMs = new Date(l.check_in).getTime();
    if (inMs >= todayStart.getTime()) {
      const end = l.check_out ? new Date(l.check_out).getTime() : Date.now();
      todayMs += end - inMs;
      if (!lastIn || inMs > lastIn) lastIn = inMs;
    }
  }
  document.getElementById('stat-hours').textContent = fmtDur(todayMs);
  document.getElementById('stat-last').textContent = lastIn ? fmtTime(lastIn) : '--:--';
  document.getElementById('stat-status').textContent = open ? t('stat.online') : t('stat.offline');

  const list = document.getElementById('recent-list');
  const recent = logs.slice(0,3);
  list.innerHTML = recent.length ? recent.map(logCardMini).join('') :
    `<div class="p-8 text-center bg-white rounded-2xl border border-dashed border-outline-variant/50 text-outline text-sm">${t('dash.empty')}</div>`;
}

function logCardMini(l){
  const ended = !!l.check_out;
  const title = ended ? t('log.end') : t('log.start');
  const when = fmtTime(ended ? l.check_out : l.check_in);
  const date = fmtDateFull(ended ? l.check_out : l.check_in);
  const dur = ended ? fmtDur((l.duration_min||0)*60000) : t('log.ongoing');
  const chip = ended
    ? `<span class="inline-block px-2 py-0.5 bg-tertiary-fixed-dim/30 text-tertiary text-[9px] font-bold rounded-full">${t('log.verified')}</span>`
    : `<span class="inline-block px-2 py-0.5 bg-secondary-fixed text-secondary text-[9px] font-bold rounded-full">${t('log.ongoing')}</span>`;
  const iconBg = ended ? 'bg-blue-50 text-primary' : 'bg-orange-50 text-secondary';
  const iconName = ended ? 'history' : 'work';
  return `
    <div class="flex items-center gap-3 p-3 md:p-4 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100">
      <div class="w-11 h-11 md:w-12 md:h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0">
        <span class="material-symbols-outlined">${iconName}</span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-bold text-primary truncate">${title}</p>
        <p class="text-xs text-outline truncate">${date} · ${when}</p>
      </div>
      <div class="text-end shrink-0">
        <p class="text-sm font-bold text-on-surface">${dur}</p>
        ${chip}
      </div>
    </div>`;
}

// ============= History =============
let historyMap = null;
async function initHistory(){
  if (!state.user){ location.href='index.html'; return; }
  applyLangDir();
  wireCommon();
  document.getElementById('user-initials').textContent = initials(state.user.name);
  if (state.user.is_admin) {
    document.getElementById('admin-btn')?.classList.remove('hidden');
    document.getElementById('map-container')?.classList.remove('hidden');
    document.getElementById('hist-grid')?.classList.add('lg:grid','lg:grid-cols-3');
    document.getElementById('hist-left')?.classList.add('lg:col-span-2');
  }

  let filter = 'week';
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.onclick = () => { filter=b.dataset.filter; updateFilterBtns(filter); renderHist(filter); };
  });
  updateFilterBtns(filter);
  document.getElementById('btn-export').onclick = exportCSV;
  await renderHist(filter);
}

function updateFilterBtns(active){
  document.querySelectorAll('[data-filter]').forEach(b => {
    const on = b.dataset.filter === active;
    b.className = 'px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition ' + (on ? 'bg-primary text-white shadow' : 'bg-surface-container text-on-surface hover:bg-surface-container-high');
  });
}

async function renderHist(filter){
  const allLogs = await myLogs(200);
  const now = Date.now();
  const from = filter==='week' ? now-7*864e5 : filter==='month' ? now-30*864e5 : 0;
  const logs = allLogs.filter(l => new Date(l.check_in).getTime() >= from);
  window._histLogs = logs;
  const list = document.getElementById('history-list');
  if (!logs.length) {
    list.innerHTML = `<div class="p-10 text-center bg-white rounded-3xl border border-dashed border-outline-variant/50 text-outline col-span-full">${t('history.empty')}</div>`;
    document.getElementById('map-container').classList.add('hidden');
    return;
  }
  list.innerHTML = logs.map(histCard).join('');

  // Map (admin only)
  const mapped = logs.filter(l => l.lat_in && l.lng_in);
  if (mapped.length && state.user.is_admin) {
    document.getElementById('map-container').classList.remove('hidden');
    if (historyMap) historyMap.remove();
    const first = mapped[0];
    historyMap = createMap('hist-map', [first.lat_in, first.lng_in], 11);
    const bounds = [];
    mapped.forEach((l,i) => {
      const color = l.check_out ? '#003a3d' : '#fe7d5e';
      const m = L.marker([l.lat_in, l.lng_in], { icon: pinIcon(color, i+1) }).addTo(historyMap);
      m.bindPopup(`<b>${fmtDateFull(l.check_in)}</b><br>${fmtTime(l.check_in)} · ${l.location_in||''}<br>${l.check_out?fmtDur((l.duration_min||0)*60000):t('log.ongoing')}`);
      bounds.push([l.lat_in, l.lng_in]);
    });
    if (bounds.length>1) historyMap.fitBounds(bounds, { padding: [30,30] });
  }
}

function histCard(l){
  const ended = !!l.check_out;
  const inHr = new Date(l.check_in).getHours();
  const late = inHr >= 9;
  const chip = !ended
    ? `<span class="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-xs font-semibold">${t('log.ongoing')}</span>`
    : late
      ? `<span class="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-xs font-semibold">${t('history.late')}</span>`
      : `<span class="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-xs font-semibold">${t('history.ontime')}</span>`;
  const mapUrl = l.lat_in ? tileUrl(l.lat_in, l.lng_in) : 'assets/map-placeholder.svg';
  return `
    <div class="bg-white rounded-xl p-4 shadow-[0_4px_20px_rgba(15,76,129,0.08)] border border-outline-variant/40 flex flex-col gap-3">
      <div class="flex justify-between items-start gap-2">
        <div class="flex flex-col min-w-0">
          <span class="text-[11px] text-outline uppercase tracking-wider font-semibold">${fmtDateFull(l.check_in)}</span>
          <div class="flex items-center gap-1 mt-1">
            <span class="material-symbols-outlined text-primary text-[18px]">schedule</span>
            <span class="text-lg font-bold text-primary">${fmtTime(l.check_in)}</span>
          </div>
        </div>
        ${chip}
      </div>
      <div class="flex gap-3 items-center bg-surface-container-low rounded-lg p-2">
        <div class="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-outline-variant bg-surface-container">
          <img class="w-full h-full object-cover" src="${mapUrl}" alt="map" onerror="this.src='assets/map-placeholder.svg'"/>
        </div>
        <div class="flex flex-col min-w-0 flex-1">
          <div class="flex items-center gap-1">
            <span class="material-symbols-outlined text-secondary text-[16px]">location_on</span>
            <span class="text-sm font-semibold text-on-surface truncate">${l.location_in||'—'}</span>
          </div>
          <p class="text-xs text-outline mt-1">${ended?fmtDur((l.duration_min||0)*60000):t('log.ongoing')}</p>
        </div>
      </div>
      <div class="flex justify-between items-center pt-2 border-t border-surface-variant/30">
        <span class="text-xs text-on-surface-variant">${state.lang==='ar'?'انصراف':'Out'}: ${ended?fmtTime24(l.check_out):'—'}</span>
        <button class="text-primary text-sm font-semibold flex items-center gap-1" onclick="App.showDetails('${l.id}')">
          ${t('history.details')} <span class="material-symbols-outlined text-[16px] rtl:rotate-180">chevron_right</span>
        </button>
      </div>
    </div>`;
}

function tileUrl(lat,lng){
  const z=15, n=Math.pow(2,z);
  const x=Math.floor((lng+180)/360*n);
  const la=lat*Math.PI/180;
  const y=Math.floor((1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n);
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function showDetails(id){
  const l = (window._histLogs||[]).find(x => x.id===id) || (window._adminLogs||[]).find(x=>x.id===id);
  if(!l) return;
  const lines = [
    `${state.lang==='ar'?'الحضور':'Check-in'}: ${fmtTime24(l.check_in)} · ${l.location_in||'—'}`,
    l.check_out ? `${state.lang==='ar'?'الانصراف':'Check-out'}: ${fmtTime24(l.check_out)} · ${l.location_out||'—'}` : (state.lang==='ar'?'المناوبة جارية':'Shift ongoing'),
    l.check_out ? `${state.lang==='ar'?'المدة':'Duration'}: ${fmtDur((l.duration_min||0)*60000)}` : ''
  ].filter(Boolean);
  alert(lines.join('\n'));
}

async function exportCSV(){
  const logs = window._histLogs || await myLogs(500);
  const rows = [['date','check_in','check_out','duration_min','location_in','location_out','lat_in','lng_in']];
  for (const l of logs) {
    rows.push([
      new Date(l.check_in).toISOString().slice(0,10),
      fmtTime24(l.check_in),
      l.check_out?fmtTime24(l.check_out):'',
      l.duration_min||'',
      l.location_in||'', l.location_out||'',
      l.lat_in||'', l.lng_in||''
    ]);
  }
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`alyame_attendance_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ============= Admin =============
let adminMap = null, adminTab = 'employees';

async function initAdmin(){
  if (!state.user || !state.user.is_admin){ location.href='index.html'; return; }
  applyLangDir();
  wireCommon();
  document.getElementById('user-initials').textContent = initials(state.user.name);

  // Tab wiring
  document.querySelectorAll('[data-tab]').forEach(b => {
    b.onclick = () => switchTab(b.dataset.tab);
  });
  document.getElementById('btn-add-emp').onclick = () => openEmpModal();
  document.getElementById('emp-form').onsubmit = saveEmp;
  document.getElementById('btn-cancel-emp').onclick = closeEmpModal;
  document.getElementById('admin-export').onclick = exportAllCSV;
  const lf = document.getElementById('log-form');
  if (lf) lf.onsubmit = saveLog;

  await refreshStats();
  switchTab('employees');
}

function switchTab(tab){
  adminTab = tab;
  document.querySelectorAll('[data-tab]').forEach(b => {
    const a = b.dataset.tab === tab;
    b.classList.toggle('bg-primary', a); b.classList.toggle('text-white', a);
    b.classList.toggle('text-on-surface-variant', !a); b.classList.toggle('bg-surface-container', !a);
  });
  document.querySelectorAll('[data-tabpane]').forEach(p => p.classList.toggle('hidden', p.dataset.tabpane !== tab));
  if (tab==='employees') loadEmployees();
  if (tab==='logs') loadAllLogs();
  if (tab==='livemap') loadLiveMap();
}

async function refreshStats(){
  try {
    const emps = await sb('att_employees?select=id,active');
    const total = emps?.length||0;
    const active = emps?.filter(e=>e.active).length||0;
    const today = new Date(); today.setHours(0,0,0,0);
    const todayLogs = await sb(`att_logs?check_in=gte.${today.toISOString()}&select=id,duration_min,check_out`);
    const todayHrs = (todayLogs||[]).reduce((s,l)=>s+((l.duration_min||0)),0);
    const activeNow = (todayLogs||[]).filter(l=>!l.check_out).length;
    document.getElementById('stat-total-emp').textContent = total;
    document.getElementById('stat-active-now').textContent = activeNow;
    document.getElementById('stat-today-logs').textContent = todayLogs?.length||0;
    document.getElementById('stat-today-hours').textContent = fmtDur(todayHrs*60000);
  } catch(e){ console.error(e); }
}

async function loadEmployees(){
  const list = document.getElementById('emp-list');
  list.innerHTML = `<div class="p-6 text-center text-outline col-span-full">...</div>`;
  const emps = await sb('att_employees?order=created_at.desc');
  if (!emps?.length) { list.innerHTML = `<div class="p-10 text-center bg-white rounded-2xl border border-dashed text-outline col-span-full">${t('admin.empty')}</div>`; return; }
  list.innerHTML = emps.map(empCard).join('');
  list.querySelectorAll('[data-emp-edit]').forEach(b => b.onclick = () => {
    const e = emps.find(x=>x.id===b.dataset.empEdit); openEmpModal(e);
  });
  list.querySelectorAll('[data-emp-del]').forEach(b => b.onclick = async () => {
    if (!confirm(t('admin.confirmDel'))) return;
    await sb(`att_employees?id=eq.${b.dataset.empDel}`, { method:'DELETE' });
    toast(t('toast.deleted'),'success'); loadEmployees(); refreshStats();
  });
}

function empCard(e){
  const bg = e.is_admin ? 'bg-gradient-to-br from-primary to-primary-container text-white' : 'bg-white border border-outline-variant/40';
  const txt = e.is_admin ? 'text-white' : 'text-primary';
  const sub = e.is_admin ? 'text-white/70' : 'text-outline';
  return `
    <div class="p-4 rounded-2xl shadow-sm ${bg} flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full ${e.is_admin?'bg-white/20':'bg-primary-fixed'} flex items-center justify-center font-extrabold ${e.is_admin?'text-white':'text-primary'}">${initials(e.name)}</div>
        <div class="flex-1 min-w-0">
          <p class="font-bold ${txt} truncate">${e.name} ${e.is_admin?'<span class="text-[10px] bg-white/20 px-2 py-0.5 rounded-full align-middle ms-1">ADMIN</span>':''}</p>
          <p class="text-xs ${sub}">${t('role.'+e.role)} ${e.branch?'· '+e.branch:''}</p>
        </div>
        <span class="w-2.5 h-2.5 rounded-full ${e.active?'bg-tertiary-container':'bg-outline'}"></span>
      </div>
      <div class="flex items-center justify-between pt-2 border-t ${e.is_admin?'border-white/20':'border-outline-variant/30'}">
        <span class="text-xs ${sub} font-mono" dir="ltr">${e.phone}</span>
        <div class="flex gap-1">
          <button data-emp-edit="${e.id}" class="w-8 h-8 rounded-lg ${e.is_admin?'hover:bg-white/20':'hover:bg-primary-fixed'} flex items-center justify-center">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          ${!e.is_admin ? `<button data-emp-del="${e.id}" class="w-8 h-8 rounded-lg hover:bg-error-container text-error flex items-center justify-center">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>` : ''}
        </div>
      </div>
    </div>`;
}

function openEmpModal(e){
  const modal = document.getElementById('emp-modal');
  modal.classList.remove('hidden');
  document.getElementById('emp-modal-title').textContent = e ? t('admin.edit') : t('admin.addEmp');
  document.getElementById('emp-id').value = e?.id || '';
  document.getElementById('emp-name').value = e?.name || '';
  document.getElementById('emp-phone').value = e?.phone || '';
  document.getElementById('emp-role').value = e?.role || 'agent';
  document.getElementById('emp-branch').value = e?.branch || '';
  document.getElementById('emp-pin').value = '';
  document.getElementById('emp-pin').placeholder = e ? '(اتركه فارغاً للإبقاء على الحالي)' : '1234';
  document.getElementById('emp-admin').checked = !!e?.is_admin;
  document.getElementById('emp-active').checked = e ? e.active : true;
}
function closeEmpModal(){ document.getElementById('emp-modal').classList.add('hidden'); }

async function saveEmp(e){
  e.preventDefault();
  const id = document.getElementById('emp-id').value;
  const name = document.getElementById('emp-name').value.trim();
  const phone = document.getElementById('emp-phone').value.trim();
  const role = document.getElementById('emp-role').value;
  const branch = document.getElementById('emp-branch').value.trim() || null;
  const pin = document.getElementById('emp-pin').value.trim();
  const is_admin = document.getElementById('emp-admin').checked;
  const active = document.getElementById('emp-active').checked;
  if (!name || !phone) return toast(t('login.fillAll'),'error');
  if (!id && !pin) return toast('PIN مطلوب للموظف الجديد','error');
  const body = { name, phone, role, branch, is_admin, active };
  if (pin) body.pin_hash = await sha256(pin);
  try {
    if (id) await sb(`att_employees?id=eq.${id}`, { method:'PATCH', body });
    else await sb('att_employees', { method:'POST', body });
    toast(t('toast.saved'),'success');
    closeEmpModal(); loadEmployees(); refreshStats();
  } catch(err){ toast(t('toast.error')+': '+err.message,'error'); }
}

async function loadAllLogs(){
  const list = document.getElementById('logs-list');
  list.innerHTML = `<div class="p-6 text-center text-outline">...</div>`;
  const logs = await sb('att_logs?order=check_in.desc&limit=100&select=*,att_employees(name,role)');
  window._adminLogs = logs;
  if (!logs?.length){ list.innerHTML = `<div class="p-10 text-center bg-white rounded-2xl border border-dashed text-outline">${t('history.empty')}</div>`; return; }
  list.innerHTML = logs.map(adminLogCard).join('');
}

function adminLogCard(l){
  const emp = l.att_employees || {};
  const ended = !!l.check_out;
  const status = !ended ? `<span class="px-2 py-1 bg-secondary-fixed text-secondary rounded-full text-xs font-bold">${t('log.ongoing')}</span>` :
    `<span class="px-2 py-1 bg-tertiary-fixed text-tertiary rounded-full text-xs font-bold">${fmtDur((l.duration_min||0)*60000)}</span>`;
  return `
    <div class="p-3 md:p-4 bg-white rounded-2xl border border-outline-variant/40 flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold shrink-0">${initials(emp.name)}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="font-bold text-primary truncate">${emp.name||'—'}</p>
          <span class="text-xs text-outline">${emp.role?t('role.'+emp.role):''}</span>
        </div>
        <p class="text-xs text-outline truncate">${fmtDateFull(l.check_in)} · ${fmtTime(l.check_in)}${ended?' → '+fmtTime(l.check_out):''}</p>
        <p class="text-xs text-outline truncate">📍 ${l.location_in||'—'}</p>
      </div>
      <div class="shrink-0 flex flex-col items-end gap-1">
        ${status}
        <button onclick="App.editLog('${l.id}')" class="text-xs text-primary font-bold flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">edit</span>تعديل</button>
      </div>
    </div>`;
}

async function loadLiveMap(){
  const logs = await sb('att_logs?check_out=is.null&select=*,att_employees(name,role)&order=check_in.desc');
  const container = document.getElementById('livemap');
  if (adminMap) { adminMap.remove(); adminMap=null; }
  container.innerHTML = '';
  const info = document.getElementById('livemap-info');
  if (!logs?.length){ info.innerHTML = `<p class="text-center text-outline py-6">${state.lang==='ar'?'لا يوجد موظفون نشطون حالياً':'No active employees right now'}</p>`; container.style.height='0'; return; }
  const valid = logs.filter(l => l.lat_in && l.lng_in);
  if (!valid.length) { info.innerHTML = `<p class="text-center text-outline py-6">${state.lang==='ar'?'الموظفون النشطون بدون موقع':'Active employees without location'}</p>`; return; }
  container.style.height='400px';
  adminMap = createMap('livemap', [valid[0].lat_in, valid[0].lng_in], 11);
  const bounds = [];
  valid.forEach(l => {
    const emp = l.att_employees||{};
    const m = L.marker([l.lat_in, l.lng_in], { icon: pinIcon('#a53b22', initials(emp.name)) }).addTo(adminMap);
    m.bindPopup(`<b>${emp.name}</b><br>${t('role.'+(emp.role||'agent'))}<br>${state.lang==='ar'?'منذ':'Since'} ${fmtTime(l.check_in)}<br>${l.location_in||''}`);
    bounds.push([l.lat_in,l.lng_in]);
  });
  if (bounds.length>1) adminMap.fitBounds(bounds,{padding:[40,40]});
  info.innerHTML = `<p class="text-sm text-on-surface-variant">${state.lang==='ar'?'إجمالي النشطين':'Total active'}: <b class="text-primary">${logs.length}</b> · ${state.lang==='ar'?'بموقع':'With GPS'}: <b class="text-primary">${valid.length}</b></p>`;
}

function toLocalInput(iso){
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function editLog(id){
  const logs = window._adminLogs || [];
  const l = logs.find(x => x.id === id);
  if (!l) return;
  const emp = l.att_employees || {};
  document.getElementById('lf-id').value = l.id;
  document.getElementById('lf-emp').textContent = (emp.name||'—') + (emp.role?' · '+t('role.'+emp.role):'');
  document.getElementById('lf-in').value = toLocalInput(l.check_in);
  document.getElementById('lf-out').value = toLocalInput(l.check_out);
  document.getElementById('lf-loc-in').value = l.location_in || '';
  document.getElementById('lf-loc-out').value = l.location_out || '';
  document.getElementById('lf-note').value = l.note || '';
  document.getElementById('log-modal').classList.remove('hidden');
}

async function saveLog(e){
  e.preventDefault();
  const id = document.getElementById('lf-id').value;
  const inVal = document.getElementById('lf-in').value;
  const outVal = document.getElementById('lf-out').value;
  if (!inVal) { alert('وقت الحضور مطلوب'); return; }
  const checkIn = new Date(inVal);
  const checkOut = outVal ? new Date(outVal) : null;
  if (checkOut && checkOut <= checkIn) { alert('وقت الانصراف يجب أن يكون بعد وقت الحضور'); return; }
  const body = {
    check_in: checkIn.toISOString(),
    check_out: checkOut ? checkOut.toISOString() : null,
    duration_min: checkOut ? Math.round((checkOut - checkIn)/60000) : null,
    status: checkOut ? 'completed' : 'ongoing',
    location_in: document.getElementById('lf-loc-in').value || null,
    location_out: document.getElementById('lf-loc-out').value || null,
    note: document.getElementById('lf-note').value || null
  };
  try {
    await sb(`att_logs?id=eq.${id}`, { method:'PATCH', body });
    document.getElementById('log-modal').classList.add('hidden');
    await loadAllLogs();
    await refreshStats();
  } catch(err){ alert('فشل الحفظ: '+err.message); }
}

async function deleteLog(){
  const id = document.getElementById('lf-id').value;
  if (!id) return;
  if (!confirm('حذف هذا السجل نهائياً؟')) return;
  try {
    await sb(`att_logs?id=eq.${id}`, { method:'DELETE' });
    document.getElementById('log-modal').classList.add('hidden');
    await loadAllLogs();
    await refreshStats();
  } catch(err){ alert('فشل الحذف: '+err.message); }
}

async function exportAllCSV(){
  const logs = await sb('att_logs?order=check_in.desc&limit=2000&select=*,att_employees(name,phone,role)');
  const rows = [['employee','phone','role','date','check_in','check_out','duration_min','location_in','location_out']];
  for (const l of logs||[]) {
    const e = l.att_employees||{};
    rows.push([e.name||'',e.phone||'',e.role||'',new Date(l.check_in).toISOString().slice(0,10),fmtTime24(l.check_in),l.check_out?fmtTime24(l.check_out):'',l.duration_min||'',l.location_in||'',l.location_out||'']);
  }
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`alyame_all_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ============= Common =============
function wireCommon(){
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => location.href = b.dataset.nav);
  document.querySelectorAll('[data-toggle-lang]').forEach(b => b.onclick = () => {
    state.lang = state.lang==='ar' ? 'en' : 'ar'; saveSess(); location.reload();
  });
  document.querySelectorAll('[data-logout]').forEach(b => b.onclick = () => {
    if (!confirm(t('confirm.logout'))) return;
    state.user = null; saveSess(); location.href='index.html';
  });
}

window.App = { initLogin, initDashboard, initHistory, initAdmin, showDetails, editLog, deleteLog, state };
})();
