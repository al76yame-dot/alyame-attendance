// Alyame Travel & Tourism — Attendance System
// Backend: Supabase | Maps: Leaflet + OSM
(function(){
const APP_VERSION = '2026.05.10.10';
const SB_URL = 'https://nzuffplbcgzkhqbjenik.supabase.co';
const SB_KEY = 'sb_publishable_U81gIoQfLsWz45QNjf8PZg_TL0EDbeF';
const LS_USER='alyame_sess', LS_LANG='alyame_lang', LS_VER='alyame_ver';

// Service Worker registration (for offline + notifications + future push)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>null);
  });
  // Persist auto-renewed subscriptions sent from the Service Worker
  navigator.serviceWorker.addEventListener('message', async (e) => {
    if (e.data && e.data.type === 'resubscribe' && e.data.subscription) {
      try {
        const j = e.data.subscription;
        const u = JSON.parse(localStorage.getItem('alyame_sess') || 'null');
        if (!u) return;
        await sb('att_push_subs?on_conflict=endpoint', {
          method:'POST',
          headers:{ 'Prefer':'resolution=merge-duplicates,return=minimal' },
          body:{ employee_id:u.id, endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth, user_agent:navigator.userAgent.slice(0,200) }
        });
      } catch(_){}
    }
  });
}

// Auto-update detector: checks GitHub for newer version every page load
async function clearAllCaches(){
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
  } catch(_){}
}

async function checkForUpdates(){
  try {
    const r = await fetch('version.txt?_=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const remote = (await r.text()).trim();
    const local = localStorage.getItem(LS_VER);
    if (!local) { localStorage.setItem(LS_VER, remote); return; }
    if (remote && remote !== local) {
      localStorage.setItem(LS_VER, remote);
      await clearAllCaches();
      location.reload();
    }
  } catch(_){}
}
checkForUpdates();

// Emergency reset via URL: ?reset=1
if (location.search.includes('reset=1')) {
  clearAllCaches().then(() => {
    location.replace(location.pathname);
  });
}

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
    'role.bookings':'مسؤول حجوزات تذاكر وفنادق','role.visas':'مسؤول تأشيرات','role.finance':'القسم المالي','role.delegate':'مندوب',
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
    'role.bookings':'Bookings (Tickets & Hotels)','role.visas':'Visas','role.finance':'Finance','role.delegate':'Delegate',
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
let _lastGeoError = null;
async function getLocation(){
  _lastGeoError = null;
  if(!navigator.geolocation){ _lastGeoError='unsupported'; return null; }
  const tryGet = (opts) => new Promise(res => {
    navigator.geolocation.getCurrentPosition(
      p => res({lat:p.coords.latitude, lng:p.coords.longitude, accuracy:p.coords.accuracy}),
      err => { _lastGeoError = err.code; res(null); },
      opts
    );
  });
  // 1st: high accuracy, generous timeout
  let pos = await tryGet({ enableHighAccuracy:true, timeout:15000, maximumAge:30000 });
  // 2nd: fall back to low accuracy (network/cell-based) if high accuracy failed
  if (!pos) pos = await tryGet({ enableHighAccuracy:false, timeout:15000, maximumAge:60000 });
  return pos;
}
function geoErrorText(){
  if (_lastGeoError === 1) return 'تم رفض إذن الموقع — فعّله من إعدادات المتصفح';
  if (_lastGeoError === 2) return 'تعذّر تحديد الموقع — تأكد أن GPS مفعّل';
  if (_lastGeoError === 3) return 'انتهت مهلة تحديد الموقع — حاول في مكان مكشوف';
  if (_lastGeoError === 'unsupported') return 'المتصفح لا يدعم تحديد الموقع';
  return 'تعذّر تحديد الموقع';
}
function retryLocation(){ location.reload(); }
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
// Country codes used by Alyame (Libya: 218, Egypt: 20). Add more here when expanding.
const COUNTRY_CODES = ['218','20'];

function digitsOnly(p){ return String(p||'').replace(/\D/g,''); }

function phoneVariants(phone){
  const raw = String(phone||'').trim();
  if (!raw) return [];
  if (raw.toLowerCase() === 'admin') return ['admin'];
  const variants = new Set();
  variants.add(raw);
  let d = digitsOnly(raw);
  // strip leading 00 (international prefix)
  if (d.startsWith('00')) d = d.slice(2);
  // strip any known country code prefix (possibly multiple times for double-prefix bugs)
  let local = d;
  let stripped = true;
  while (stripped){
    stripped = false;
    for (const c of COUNTRY_CODES){
      if (local.length > c.length + 4 && local.startsWith(c)) {
        local = local.slice(c.length); stripped = true; break;
      }
    }
  }
  // strip leading zeros from local part
  while (local.startsWith('0')) local = local.slice(1);
  // generate every reasonable variant
  variants.add(d);
  variants.add(local);
  variants.add('0'+local);
  variants.add('00'+local);
  for (const c of COUNTRY_CODES){
    variants.add(c+local);
    variants.add('+'+c+local);
    variants.add('00'+c+local);
    variants.add(c+'0'+local);
    variants.add('+'+c+'0'+local);
    variants.add('00'+c+'0'+local);
  }
  return [...variants].filter(Boolean);
}

async function login(phone, pin){
  const pin_hash = await sha256(pin);
  for (const v of phoneVariants(phone)) {
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
  notifyAdminsOfCheck('in', loc).catch(()=>null);
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
  notifyAdminsOfCheck('out', loc, mins).catch(()=>null);
  return done;
}

// Notify all admins when an employee checks in/out (professional summary)
async function notifyAdminsOfCheck(kind, loc, durMin){
  if (!state.user || state.user.is_admin) return; // don't notify on admin's own actions
  try {
    // Check if admins want these notifications (default true)
    const s = await loadSettings();
    if (s.notify_admin_on_check === 'false') return;
    const admins = await sb('att_employees?is_admin=eq.true&active=eq.true&select=id');
    const adminIds = (admins||[]).map(a => a.id);
    if (!adminIds.length) return;
    const time = new Date().toLocaleTimeString('en-GB',{timeZone:'Africa/Tripoli',hour:'2-digit',minute:'2-digit',hour12:false});
    const where = loc?.name ? `📍 ${loc.name}` : '📍 موقع غير محدد';
    const role = state.user.role ? `[${t('role.'+state.user.role)}] ` : '';
    const branch = state.user.branch ? ` · ${state.user.branch}` : '';
    let title, body;
    if (kind === 'in'){
      title = `🟢 حضور: ${state.user.name}`;
      body = `${role}${time}${branch}\n${where}`;
    } else {
      const h = Math.floor((durMin||0)/60), m = (durMin||0)%60;
      title = `🔴 انصراف: ${state.user.name}`;
      body = `${role}${time}${branch}\n⏱️ ${h}س ${String(m).padStart(2,'0')}د\n${where}`;
    }
    await sendBroadcastPush(title, body, adminIds);
  } catch(_){}
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
    const ccEl = document.getElementById('f-cc');
    const cc = ccEl ? ccEl.value : '';
    const rawPhone = document.getElementById('f-phone').value.trim();
    const phone = (cc && rawPhone.toLowerCase()!=='admin' && !rawPhone.startsWith('+') && !rawPhone.startsWith(cc.replace('+','')))
      ? cc + rawPhone.replace(/^0/,'')
      : rawPhone;
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
    const msg = geoErrorText();
    locEl.textContent = msg;
    verEl.innerHTML = `<span class="text-error font-semibold">${msg}</span> <button onclick="App.retryLocation()" class="text-primary underline text-xs ms-1">إعادة المحاولة</button>`;
    if (mapVisible) mapEl.innerHTML = `<div class="w-full h-full flex items-center justify-center text-outline text-sm p-3 text-center">${msg}</div>`;
  }

  // Clock button
  document.getElementById('btn-clock').onclick = async () => {
    const btn = document.getElementById('btn-clock'); btn.disabled=true;
    try {
      if (!state.currentLog) {
        const allowed = await checkGeofence(state.location);
        if (!allowed) { btn.disabled=false; return; }
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

  // Wire request modal + load my requests + show shift + alerts
  wireRequestModal();
  loadMyRequests();
  showShiftInfo();
  showFridayBanner();
  showCareBanner();
  ensureNotifyPermission().then(ok => { if (ok) subscribeToPush(); checkNotifStatus(); });
  setTimeout(checkNotifStatus, 1500);
  runShiftAlerts();
  setInterval(runShiftAlerts, 60000);

  await renderDash();
  setInterval(renderDash, 60000);
}

// ============= Settings / Geofence =============
async function loadSettings(){
  const rows = await sb('att_settings?select=key,value');
  const map = {};
  (rows||[]).forEach(r => map[r.key] = r.value);
  return map;
}

function distMeters(lat1,lng1,lat2,lng2){
  const R = 6371000;
  const toRad = d => d*Math.PI/180;
  const dLat = toRad(lat2-lat1), dLng = toRad(lng2-lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

function branchesFromSettings(s){
  return [
    { key:'tripoli', name:s.branch_tripoli_name||'طرابلس',
      lat:parseFloat(s.branch_tripoli_lat), lng:parseFloat(s.branch_tripoli_lng),
      radius:parseInt(s.branch_tripoli_radius_m || s.geofence_radius_m || '300'),
      start:s.branch_tripoli_start||'08:00', end:s.branch_tripoli_end||'17:00' },
    { key:'cairo', name:s.branch_cairo_name||'القاهرة',
      lat:parseFloat(s.branch_cairo_lat), lng:parseFloat(s.branch_cairo_lng),
      radius:parseInt(s.branch_cairo_radius_m || s.geofence_radius_m || '300'),
      start:s.branch_cairo_start||'09:00', end:s.branch_cairo_end||'17:00' }
  ];
}

async function checkGeofence(loc){
  const s = await loadSettings();
  if (s.geofence_enforce !== 'true') return true;
  if (!loc || !loc.lat) { alert('لا يمكن تسجيل الحضور بدون موقع GPS'); return false; }
  const branches = branchesFromSettings(s).filter(b => !isNaN(b.lat) && !isNaN(b.lng));
  for (const b of branches){
    const d = distMeters(loc.lat, loc.lng, b.lat, b.lng);
    if (d <= b.radius) return true;
  }
  const closest = branches.map(b => ({ b, d: distMeters(loc.lat,loc.lng,b.lat,b.lng) })).sort((a,b)=>a.d-b.d)[0];
  if (closest) alert(`أنت خارج نطاق المكتب.\nأقرب مكتب: ${closest.b.name} (${Math.round(closest.d)} م)\nالنطاق المسموح: ${closest.b.radius} م`);
  return false;
}

function detectUserBranch(branches, loc, userBranchText){
  // 1) match by current location (closest within radius)
  if (loc && loc.lat){
    const inside = branches
      .filter(b => !isNaN(b.lat))
      .map(b => ({ b, d: distMeters(loc.lat,loc.lng,b.lat,b.lng) }))
      .filter(x => x.d <= x.b.radius)
      .sort((a,b)=>a.d-b.d);
    if (inside.length) return inside[0].b;
  }
  // 2) match by branch text
  const t = (userBranchText||'').toLowerCase();
  if (t.includes('طرابلس') || t.includes('tripoli') || t.includes('libya') || t.includes('ليبيا')) return branches[0];
  if (t.includes('قاهرة') || t.includes('cairo') || t.includes('egypt') || t.includes('مصر')) return branches[1];
  return branches[0];
}

// ============= Web Push subscription =============
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIOS(){
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function checkNotifStatus(){
  const banner = document.getElementById('notif-banner');
  if (!banner) return;

  // iOS-specific: notifications ONLY work when installed to home screen
  if (isIOS() && !isStandalone()) {
    banner.innerHTML = `<div class="flex items-start gap-3">
      <span class="material-symbols-outlined text-3xl">ios_share</span>
      <div class="flex-1 min-w-0">
        <h4 class="font-bold mb-0.5">📱 لتفعيل الإشعارات على iPhone</h4>
        <p class="text-xs opacity-95">١) اضغط زر المشاركة ⬆️ في Safari<br>٢) اختر "إضافة إلى الشاشة الرئيسية"<br>٣) افتح التطبيق من الأيقونة الجديدة وفعّل الإشعارات</p>
      </div>
    </div>`;
    banner.classList.remove('hidden');
    return;
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    banner.innerHTML = `<div class="flex items-center gap-3"><span class="material-symbols-outlined text-3xl">warning</span><div class="flex-1"><h4 class="font-bold mb-0.5">المتصفح لا يدعم الإشعارات</h4><p class="text-xs opacity-95">استخدم Chrome على Android، أو ثبّت التطبيق على الشاشة الرئيسية على iPhone</p></div></div>`;
    banner.classList.remove('hidden');
    return;
  }
  let needsBanner = false;
  if (Notification.permission !== 'granted') {
    needsBanner = true;
  } else {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) needsBanner = true;
    } catch { needsBanner = true; }
  }
  banner.classList.toggle('hidden', !needsBanner);

  // If notifications are active, show a small self-test button instead
  const testBtn = document.getElementById('notif-test-btn');
  if (testBtn) testBtn.classList.toggle('hidden', needsBanner);
}

// Employee self-test: send a push to own devices to verify delivery
async function testMyNotification(){
  if (Notification.permission !== 'granted') { return enableNotifications(); }
  await subscribeToPush(true); // force-refresh subscription first
  try {
    const r = await sendBroadcastPush('🔔 اختبار الإشعار', 'إذا وصلك هذا الإشعار، فالنظام يعمل لديك بنجاح ✅', [state.user.id]);
    if (r.sent > 0) {
      toast(`تم إرسال إشعار اختبار إلى ${r.sent} جهاز`, 'success');
    } else {
      toast('لا يوجد جهاز مشترك — أعد تفعيل الإشعارات', 'error');
    }
  } catch(e){ toast('فشل الاختبار: '+e.message, 'error'); }
}

function showNotifGuide(){
  const m = document.getElementById('notif-guide');
  if (m) { m.classList.remove('hidden'); m.style.display = 'flex'; }
}

async function enableNotifications(){
  if (Notification.permission === 'denied') {
    alert('الإشعارات محظورة من إعدادات المتصفح. افتح إعدادات الموقع وفعّل الإشعارات يدوياً.');
    return;
  }
  const ok = await ensureNotifyPermission();
  if (!ok) {
    alert('يجب السماح بالإشعارات من رسالة المتصفح');
    return;
  }
  await subscribeToPush();
  await checkNotifStatus();
  // Test notification
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('✅ تم تفعيل الإشعارات', {
      body: 'ستصلك الآن تنبيهات الحضور والانصراف',
      icon: 'assets/logo.png',
      vibrate: [300,150,300]
    });
  } catch(_){}
}

async function subscribeToPush(force){
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    const s = await loadSettings();
    const vapid = s.vapid_public_key;
    if (!vapid) return false; // not configured yet
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    // Force-refresh stale subscriptions (push endpoints can silently die,
    // especially on iOS/Safari after ~weeks). Re-subscribe if older than 7 days.
    const LAST = 'alyame_push_refreshed';
    const lastRefresh = parseInt(localStorage.getItem(LAST) || '0');
    const isStale = (Date.now() - lastRefresh) > 7*24*60*60*1000;

    if (sub && (force || isStale)) {
      try { await sub.unsubscribe(); } catch(_){}
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid)
      });
    }
    const json = sub.toJSON();
    const body = {
      employee_id: state.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0,200)
    };
    await sb('att_push_subs?on_conflict=endpoint', {
      method:'POST',
      headers:{ 'Prefer':'resolution=merge-duplicates,return=minimal' },
      body
    });
    localStorage.setItem(LAST, String(Date.now()));
    return true;
  } catch(e){ console.warn('push subscribe failed', e); return false; }
}

async function sendBroadcastPush(title, body, employee_ids){
  // Calls the Edge Function send-push
  const url = `${SB_URL}/functions/v1/send-push`;
  const r = await fetch(url, {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+SB_KEY,
      'apikey':SB_KEY
    },
    body: JSON.stringify({ title, body, employee_ids: employee_ids||null })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ============= Notifications / Alerts / Auto-checkout =============
function notifySupported(){ return ('Notification' in window); }
async function ensureNotifyPermission(){
  if (!notifySupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { const p = await Notification.requestPermission(); return p === 'granted'; } catch { return false; }
}
function beep(times=2){
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    let t = ctx.currentTime;
    for (let i=0;i<times;i++){
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type='sine'; o.frequency.value=880;
      g.gain.value=0.15;
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t+0.25);
      t += 0.4;
    }
  } catch(_){}
}
function vibrate(pattern){ if (navigator.vibrate) try { navigator.vibrate(pattern); } catch(_){} }
function showAlert(title, body){
  beep(3);
  vibrate([300,150,300,150,300]);
  if (notifySupported() && Notification.permission==='granted'){
    try {
      // Use SW registration directly (most reliable, includes vibration)
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body, icon:'assets/logo.png', badge:'assets/logo.png',
            vibrate:[400,200,400,200,400], tag: title, requireInteraction: false
          });
        });
      } else {
        new Notification(title, { body, icon:'assets/logo.png', tag: title });
      }
    } catch(_){}
  }
  // In-page banner
  const b = document.createElement('div');
  b.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 bg-primary text-white rounded-2xl shadow-2xl font-bold flex items-center gap-2 animate-[slideDown_.3s]';
  b.style.maxWidth = '90vw';
  b.innerHTML = `<span class="material-symbols-outlined">notifications_active</span><div><div>${title}</div><div class="text-xs font-medium opacity-90">${body}</div></div>`;
  document.body.appendChild(b);
  setTimeout(()=> b.remove(), 8000);
}

function todayKey(suffix){ return 'alyame_alert_'+new Date().toISOString().slice(0,10)+'_'+suffix; }
function alertedToday(suffix){ return localStorage.getItem(todayKey(suffix)) === '1'; }
function markAlerted(suffix){ localStorage.setItem(todayKey(suffix),'1'); }

function timeToMinutes(hhmm){
  if (!hhmm) return null;
  const [h,m] = hhmm.split(':').map(Number);
  return h*60 + (m||0);
}
function nowMinutes(){
  const d = new Date(); return d.getHours()*60 + d.getMinutes();
}

async function runShiftAlerts(){
  if (!state.user || state.user.is_admin) return;
  // Friday is official holiday — skip all shift alerts
  if (new Date().getDay() === 5) return;
  try {
    const s = await loadSettings();
    const branches = branchesFromSettings(s);
    const b = detectUserBranch(branches, state.location, state.user.branch);
    if (!b) return;
    const startM = timeToMinutes(b.start);
    const endM = timeToMinutes(b.end);
    const now = nowMinutes();

    // Check-in reminders: repeat every 15 min for the first hour, until the employee checks in.
    // Fires at start, +15, +30, +45, +60 — stops once clocked in.
    if (startM != null && !state.currentLog) {
      for (const offset of [0, 15, 30, 45, 60]) {
        const slotKey = 'in' + offset;
        if (now >= startM + offset && now < startM + offset + 15 && !alertedToday(slotKey)) {
          markAlerted(slotKey);
          const remaining = 60 - offset;
          const tail = offset === 0
            ? 'سجّل حضورك الآن.'
            : offset >= 60
              ? 'هذا آخر تذكير. سجّل حضورك الآن.'
              : `سيتكرر التذكير كل 15 دقيقة (${remaining} دقيقة متبقية).`;
          const head = offset === 0
            ? `بدأ دوامك الآن (${b.start}).`
            : `مرّت ${offset} دقيقة على بداية الدوام (${b.start}).`;
          showAlert('🔔 وقت الحضور / Check-in', `${head} ${tail}`);
          break; // only one alert per tick
        }
      }
    }

    // Check-out reminder: at shift end, only if still clocked in
    if (endM!=null && now >= endM && now < endM+30 && state.currentLog && !alertedToday('out')) {
      markAlerted('out');
      showAlert('🔔 وقت الانصراف / Check-out', `انتهى دوامك (${b.end}). لا تنسَ تسجيل انصرافك.`);
    }

    // Auto check-out 30 min after shift end if forgotten
    if (endM!=null && now >= endM+30 && state.currentLog && !alertedToday('autoout')) {
      markAlerted('autoout');
      try {
        await checkOut(state.location);
        showAlert('✅ انصراف تلقائي / Auto Check-out', `تم تسجيل انصرافك تلقائياً بعد 30 دقيقة من نهاية الدوام (${b.end}).`);
        await renderDash();
      } catch(_){}
    }
  } catch(_){}
}

function showFridayBanner(){
  const banner = document.getElementById('friday-banner');
  if (!banner) return;
  const day = new Date().getDay(); // 0=Sun, 5=Fri, 6=Sat
  if (day === 5) {
    banner.classList.remove('hidden');
    // Hide shift-info on Friday (no work today)
    const si = document.getElementById('shift-info'); if (si) si.classList.add('hidden');
    // Disable check-in button on Friday
    const btn = document.getElementById('btn-clock');
    if (btn && !state.currentLog) {
      btn.classList.add('opacity-60');
      btn.style.pointerEvents = 'none';
      const hint = document.getElementById('clock-hint');
      if (hint) hint.textContent = 'اليوم عطلة الجمعة';
    }
  }
}

async function showCareBanner(){
  const banner = document.getElementById('care-banner');
  if (!banner) return;
  try {
    const s = await loadSettings();
    if (s.care_active === 'true' && (s.care_title || s.care_msg)){
      document.getElementById('care-title').textContent = s.care_title || 'إعلان الإدارة';
      document.getElementById('care-msg').textContent = s.care_msg || '';
      banner.classList.remove('hidden');
    }
  } catch(_){}
}

async function showShiftInfo(){
  const el = document.getElementById('shift-info');
  if (!el) return;
  try {
    const s = await loadSettings();
    const branches = branchesFromSettings(s);
    const b = detectUserBranch(branches, state.location, state.user.branch);
    if (!b) return;
    document.getElementById('shift-start').textContent = b.start;
    document.getElementById('shift-end').textContent = b.end;
    document.getElementById('shift-branch').textContent = '· ' + b.name;
    el.classList.remove('hidden');
  } catch(_){}
}

// ============= Employee Requests =============
function openReqModal(){
  const m = document.getElementById('req-modal');
  if (!m) { alert('نموذج الطلب غير متاح'); return; }
  const fromEl = document.getElementById('rq-from');
  const toEl   = document.getElementById('rq-to');
  const reasonEl = document.getElementById('rq-reason');
  const typeEl = document.getElementById('rq-type');
  const timeRow = document.getElementById('rq-time-row');
  if (fromEl) fromEl.value = new Date().toISOString().slice(0,10);
  if (toEl) toEl.value = '';
  if (reasonEl) reasonEl.value = '';
  if (typeEl) typeEl.value = 'leave';
  if (timeRow) timeRow.classList.add('hidden');
  // Ensure modal is on top of everything (move to body if not already)
  if (m.parentElement && m.parentElement !== document.body) {
    document.body.appendChild(m);
  }
  m.classList.remove('hidden');
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeReqModal(){
  const m = document.getElementById('req-modal');
  if (!m) return;
  m.classList.add('hidden');
  m.style.display = 'none';
  document.body.style.overflow = '';
}

function wireRequestModal(){
  const btn = document.getElementById('btn-new-request');
  if (!btn) return;
  btn.onclick = openReqModal;
  // Also support clicking the close X / cancel buttons globally via event delegation
  document.addEventListener('click', (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-close-req]')) closeReqModal();
  });
  const typeEl = document.getElementById('rq-type');
  if (typeEl) typeEl.onchange = (e) => {
    const tr = document.getElementById('rq-time-row');
    if (tr) tr.classList.toggle('hidden', e.target.value !== 'permission');
  };
  document.getElementById('req-form').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('rq-type').value;
    const body = {
      employee_id: state.user.id,
      type,
      start_date: document.getElementById('rq-from').value,
      end_date: document.getElementById('rq-to').value || null,
      start_time: type==='permission' ? (document.getElementById('rq-from-t').value||null) : null,
      end_time:   type==='permission' ? (document.getElementById('rq-to-t').value||null)   : null,
      reason: document.getElementById('rq-reason').value || null,
      status: 'pending'
    };
    try {
      await sb('att_requests', { method:'POST', body });
      closeReqModal();
      toast('تم إرسال الطلب','success');
      loadMyRequests();
      // Notify admins via push
      try {
        const admins = await sb('att_employees?is_admin=eq.true&active=eq.true&select=id');
        const adminIds = (admins||[]).map(a => a.id);
        if (adminIds.length) {
          const typeAr = type==='leave' ? 'إجازة' : 'إذن';
          await sendBroadcastPush(
            `📨 طلب ${typeAr} جديد`,
            `${state.user.name} — ${body.start_date}${body.end_date?' إلى '+body.end_date:''}`,
            adminIds
          );
        }
      } catch(_){}
    } catch(err){ toast('فشل الإرسال: '+err.message,'error'); }
  };
}

async function loadMyRequests(){
  const list = document.getElementById('my-requests');
  if (!list) return;
  const rows = await sb(`att_requests?employee_id=eq.${state.user.id}&order=created_at.desc&limit=20`);
  if (!rows || !rows.length) { list.innerHTML = `<div class="p-6 text-center bg-white rounded-2xl border border-dashed text-outline col-span-full">لا توجد طلبات</div>`; return; }
  list.innerHTML = rows.map(r => {
    const isLeave = r.type==='leave';
    const statColor = r.status==='approved'?'bg-tertiary text-white':r.status==='rejected'?'bg-error text-white':'bg-secondary text-white';
    const statText = r.status==='approved'?'✓ مقبول':r.status==='rejected'?'✗ مرفوض':'⏳ قيد الانتظار';
    const typeText = isLeave?'إجازة':'إذن';
    const typeIcon = isLeave?'event_busy':'schedule';
    return `<div class="p-4 bg-white rounded-2xl border border-outline-variant/30 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-primary">${typeIcon}</span>
          <span class="font-bold text-primary">${typeText}</span>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${statColor}">${statText}</span>
      </div>
      <p class="text-xs text-outline" dir="ltr">📅 ${r.start_date}${r.end_date?' → '+r.end_date:''}</p>
      ${r.start_time?`<p class="text-xs text-outline mt-0.5" dir="ltr">⏰ ${r.start_time}${r.end_time?' → '+r.end_time:''}</p>`:''}
      ${r.reason?`<p class="text-sm mt-2">${r.reason}</p>`:''}
      ${r.admin_note?`<div class="mt-2 p-2 bg-primary-fixed text-primary rounded-lg"><p class="text-xs font-bold mb-0.5">📩 رد المدير:</p><p class="text-sm">${r.admin_note}</p></div>`:''}
    </div>`;
  }).join('');

  showDecidedRequestPopup(rows);
}

function showDecidedRequestPopup(rows){
  const modal = document.getElementById('req-result-modal');
  if (!modal) return;
  const SEEN = 'alyame_seen_decisions';
  let seen = [];
  try { seen = JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch(_){}
  const decided = (rows||[]).filter(r => (r.status==='approved' || r.status==='rejected') && r.decided_at && !seen.includes(r.id));
  if (!decided.length) return;
  decided.sort((a,b)=> new Date(b.decided_at) - new Date(a.decided_at));
  const r = decided[0];
  const approved = r.status==='approved';
  const typeText = r.type==='leave' ? 'إجازة' : 'إذن';
  document.getElementById('rr-head').style.background = approved
    ? 'linear-gradient(135deg,#003a3d,#2e7d32)'
    : 'linear-gradient(135deg,#a53b22,#c62828)';
  document.getElementById('rr-icon').textContent = approved ? '✅' : '❌';
  document.getElementById('rr-title').textContent = approved ? `تم قبول طلب ${typeText}` : `تم رفض طلب ${typeText}`;
  document.getElementById('rr-type').textContent = approved ? 'وافقت الإدارة على طلبك' : 'لم توافق الإدارة على طلبك';
  document.getElementById('rr-dates').textContent =
    `📅 ${r.start_date}${r.end_date?' → '+r.end_date:''}` +
    (r.start_time?`  ⏰ ${r.start_time}${r.end_time?' → '+r.end_time:''}`:'');
  const noteBox = document.getElementById('rr-note-box');
  if (r.admin_note) {
    document.getElementById('rr-note').textContent = r.admin_note;
    noteBox.classList.remove('hidden');
  } else { noteBox.classList.add('hidden'); }
  modal.classList.remove('hidden');
  try { beep(2); vibrate([300,150,300]); } catch(_){}
  const allDecided = (rows||[]).filter(x => x.decided_at).map(x => x.id);
  localStorage.setItem(SEEN, JSON.stringify(allDecided));
}

// ============= Admin: Requests management =============
async function loadAdminRequests(filter='pending'){
  const list = document.getElementById('requests-list');
  if (!list) return;
  list.innerHTML = `<div class="p-6 text-center text-outline col-span-full">جاري التحميل...</div>`;
  let rows;
  try {
    let q = 'att_requests?order=created_at.desc&select=*,att_employees!att_requests_employee_id_fkey(name,phone,role)';
    if (filter !== 'all') q += `&status=eq.${filter}`;
    rows = await sb(q);
  } catch(e){
    list.innerHTML = `<div class="p-6 text-center bg-error-container text-error rounded-2xl col-span-full">فشل تحميل الطلبات: ${e.message}</div>`;
    return;
  }
  window._adminReqs = rows;
  if (!rows || !rows.length){ list.innerHTML = `<div class="p-10 text-center bg-white rounded-2xl border border-dashed text-outline col-span-full">لا توجد طلبات</div>`; return; }
  list.innerHTML = rows.map(r => {
    const e = r.att_employees||{};
    const isLeave = r.type==='leave';
    const typeText = isLeave?'إجازة / Leave':'إذن / Permission';
    const typeIcon = isLeave?'event_busy':'schedule';
    const typeColor = isLeave?'text-secondary bg-secondary-container/20':'text-tertiary bg-tertiary-container/20';
    const statColor = r.status==='approved'?'bg-tertiary text-white':r.status==='rejected'?'bg-error text-white':'bg-secondary text-white';
    const statText = r.status==='approved'?'✓ مقبول':r.status==='rejected'?'✗ مرفوض':'⏳ قيد الانتظار';
    // Calculate days/duration
    let durationText = '';
    if (isLeave){
      const s = new Date(r.start_date);
      const e2 = r.end_date ? new Date(r.end_date) : s;
      const days = Math.max(1, Math.round((e2 - s)/(1000*60*60*24)) + 1);
      durationText = `${days} ${days===1?'يوم':'أيام'}`;
    } else if (r.start_time && r.end_time){
      const [sh,sm] = r.start_time.split(':').map(Number);
      const [eh,em] = r.end_time.split(':').map(Number);
      const mins = (eh*60+em) - (sh*60+sm);
      if (mins > 0) durationText = `${Math.floor(mins/60)}س ${mins%60}د`;
    }
    const created = new Date(r.created_at);
    const ago = Math.round((Date.now() - created)/(1000*60));
    const agoText = ago < 60 ? `${ago} دقيقة` : ago < 1440 ? `${Math.floor(ago/60)} ساعة` : `${Math.floor(ago/1440)} يوم`;
    const actions = r.status==='pending' ? `
      <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-outline-variant/20">
        <button onclick="App.decideRequest('${r.id}','approved')" class="h-11 bg-tertiary text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 active:scale-95">
          <span class="material-symbols-outlined text-[18px]">check_circle</span>قبول
        </button>
        <button onclick="App.decideRequest('${r.id}','rejected')" class="h-11 bg-error text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 active:scale-95">
          <span class="material-symbols-outlined text-[18px]">cancel</span>رفض
        </button>
      </div>` : (r.admin_note ? `<div class="mt-3 pt-3 border-t border-outline-variant/20"><p class="text-xs text-outline mb-1">رد المدير:</p><p class="text-sm">${r.admin_note}</p></div>` : '');
    return `<div class="p-4 bg-white rounded-2xl border border-outline-variant/40 shadow-sm hover:shadow-md transition">
      <div class="flex items-start gap-3 mb-3">
        <div class="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-extrabold text-lg shrink-0">${initials(e.name)}</div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-primary truncate">${e.name||'—'}</p>
          <p class="text-xs text-outline">${e.role?t('role.'+e.role):''} ${e.phone?'· '+e.phone:''}</p>
          <p class="text-[11px] text-outline mt-0.5">قبل ${agoText}</p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-bold ${statColor} whitespace-nowrap">${statText}</span>
      </div>
      <div class="space-y-1.5 mb-1">
        <div class="flex items-center gap-2 text-sm">
          <span class="material-symbols-outlined text-[18px] ${typeColor.split(' ')[0]}">${typeIcon}</span>
          <span class="font-bold">${typeText}</span>
          ${durationText?`<span class="ms-auto text-xs px-2 py-0.5 rounded-full ${typeColor} font-bold">${durationText}</span>`:''}
        </div>
        <div class="flex items-center gap-2 text-xs text-on-surface-variant">
          <span class="material-symbols-outlined text-[16px]">date_range</span>
          <span dir="ltr">${r.start_date}${r.end_date?' → '+r.end_date:''}</span>
        </div>
        ${r.start_time?`<div class="flex items-center gap-2 text-xs text-on-surface-variant"><span class="material-symbols-outlined text-[16px]">schedule</span><span dir="ltr">${r.start_time}${r.end_time?' → '+r.end_time:''}</span></div>`:''}
        ${r.reason?`<div class="mt-2 p-2 bg-surface-container-low rounded-lg"><p class="text-xs text-outline mb-0.5">السبب:</p><p class="text-sm">${r.reason}</p></div>`:''}
      </div>
      ${actions}
    </div>`;
  }).join('');
}

async function decideRequest(id, status){
  const reqs = window._adminReqs || [];
  const req = reqs.find(r => r.id === id);
  let note = null;
  if (status === 'rejected') {
    note = prompt('سبب الرفض (سيظهر للموظف):') || null;
    if (note === null) return; // user cancelled
  } else {
    note = prompt('ملاحظة للموظف (اختياري):', '') || null;
  }
  await sb(`att_requests?id=eq.${id}`, { method:'PATCH', body:{
    status, admin_note: note, decided_by: state.user.id, decided_at: new Date().toISOString()
  }});
  // Notify employee via push
  try {
    if (req?.employee_id) {
      const typeAr = req.type==='leave' ? 'إجازة' : 'إذن';
      const statAr = status==='approved' ? '✅ تم قبول' : '❌ تم رفض';
      const noteText = note ? `\n${note}` : '';
      await sendBroadcastPush(
        `${statAr} طلب ${typeAr}`,
        `${req.start_date}${req.end_date?' إلى '+req.end_date:''}${noteText}`,
        [req.employee_id]
      );
    }
  } catch(_){}
  await loadAdminRequests(window._reqFilter||'pending');
  await refreshPendingBadge();
}

async function refreshPendingBadge(){
  const r = await sb('att_requests?status=eq.pending&select=id');
  const badge = document.getElementById('req-pending-badge');
  if (!badge) return;
  if (r && r.length) { badge.textContent = r.length; badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

// ============= Admin: Settings =============
let _branchMaps = {};

function setupBranchMap(branch, defaultLat, defaultLng){
  const containerId = `map-${branch}`;
  const el = document.getElementById(containerId);
  if (!el) return;
  if (_branchMaps[branch]) { _branchMaps[branch].map.remove(); delete _branchMaps[branch]; }
  const latInput = document.getElementById(`set-${branch}-lat`);
  const lngInput = document.getElementById(`set-${branch}-lng`);
  const radiusInput = document.getElementById(`set-${branch}-radius`);
  const lat = parseFloat(latInput.value) || defaultLat;
  const lng = parseFloat(lngInput.value) || defaultLng;
  const map = createMap(containerId, [lat, lng], 16);
  const radius = parseInt(radiusInput.value || '300');
  const marker = L.marker([lat, lng], { draggable: true, icon: pinIcon('#00355f','📍') }).addTo(map);
  const circle = L.circle([lat, lng], { radius, color:'#00355f', fillColor:'#8ebdf9', fillOpacity:0.2, weight:2 }).addTo(map);
  const update = (latlng) => {
    marker.setLatLng(latlng);
    circle.setLatLng(latlng);
    latInput.value = latlng.lat.toFixed(6);
    lngInput.value = latlng.lng.toFixed(6);
  };
  marker.on('dragend', e => update(e.target.getLatLng()));
  map.on('click', e => update(e.latlng));
  radiusInput.oninput = () => {
    const r = parseInt(radiusInput.value || '300');
    circle.setRadius(r);
  };
  _branchMaps[branch] = { map, marker, circle, radiusInput };
  latInput.value = lat.toFixed(6);
  lngInput.value = lng.toFixed(6);
}

async function loadAdminSettings(){
  const s = await loadSettings();
  const set = (id,v) => { const el = document.getElementById(id); if (el) el.value = v||''; };
  const oldRadius = s.geofence_radius_m || '300';
  set('set-tripoli-lat',    s.branch_tripoli_lat    || '32.8872');
  set('set-tripoli-lng',    s.branch_tripoli_lng    || '13.1913');
  set('set-tripoli-radius', s.branch_tripoli_radius_m || oldRadius);
  set('set-tripoli-start',  s.branch_tripoli_start  || '08:00');
  set('set-tripoli-end',    s.branch_tripoli_end    || '17:00');
  set('set-cairo-lat',      s.branch_cairo_lat      || '30.0444');
  set('set-cairo-lng',      s.branch_cairo_lng      || '31.2357');
  set('set-cairo-radius',   s.branch_cairo_radius_m || oldRadius);
  set('set-cairo-start',    s.branch_cairo_start    || '09:00');
  set('set-cairo-end',      s.branch_cairo_end      || '17:00');
  document.getElementById('set-enforce').checked = s.geofence_enforce === 'true';
  const notifyEl = document.getElementById('set-notify-check');
  if (notifyEl) notifyEl.checked = (s.notify_admin_on_check || 'true') === 'true';
  set('set-vapid', s.vapid_public_key || '');
  set('set-care-title', s.care_title || '');
  document.getElementById('set-care-msg').value = s.care_msg || '';
  document.getElementById('set-care-active').checked = s.care_active === 'true';
  setTimeout(() => {
    setupBranchMap('tripoli', 32.8872, 13.1913);
    setupBranchMap('cairo',   30.0444, 31.2357);
  }, 50);
}

async function saveSettings(){
  const v = id => document.getElementById(id).value;
  const upserts = [
    { key:'branch_tripoli_lat',      value:v('set-tripoli-lat') },
    { key:'branch_tripoli_lng',      value:v('set-tripoli-lng') },
    { key:'branch_tripoli_radius_m', value:v('set-tripoli-radius') || '300' },
    { key:'branch_tripoli_start',    value:v('set-tripoli-start') || '08:00' },
    { key:'branch_tripoli_end',      value:v('set-tripoli-end')   || '17:00' },
    { key:'branch_cairo_lat',        value:v('set-cairo-lat') },
    { key:'branch_cairo_lng',        value:v('set-cairo-lng') },
    { key:'branch_cairo_radius_m',   value:v('set-cairo-radius') || '300' },
    { key:'branch_cairo_start',      value:v('set-cairo-start') || '09:00' },
    { key:'branch_cairo_end',        value:v('set-cairo-end')   || '17:00' },
    { key:'geofence_enforce',        value:document.getElementById('set-enforce').checked ? 'true':'false' },
    { key:'notify_admin_on_check',   value:(document.getElementById('set-notify-check')?.checked) ? 'true':'false' },
    { key:'care_title',              value:v('set-care-title') || '' },
    { key:'care_msg',                value:document.getElementById('set-care-msg').value || '' },
    { key:'care_active',             value:document.getElementById('set-care-active').checked ? 'true':'false' },
    { key:'vapid_public_key',        value:v('set-vapid') || '' }
  ];
  try {
    await sb('att_settings', {
      method:'POST',
      headers:{ 'Prefer':'resolution=merge-duplicates,return=minimal' },
      body: upserts
    });
    toast('تم الحفظ','success');
  } catch(e){ toast('فشل: '+e.message,'error'); }
}

async function sendTestPushToMe(){
  try {
    const r = await sendBroadcastPush('🔔 اختبار اليامي', 'هذا إشعار تجريبي — إذا وصلك فالنظام يعمل!', [state.user.id]);
    alert(`أرسل إلى ${r.sent} من ${r.total} اشتراك مرتبط بحسابك`);
  } catch(e){ alert('فشل: '+e.message); }
}

async function resetTodayAlerts(){
  if (!confirm('سيتم إعادة تعيين تنبيهات اليوم — ستفير التنبيهات من جديد عند الأوقات المحددة')) return;
  const today = new Date().toISOString().slice(0,10);
  const keys = ['in','out','auto'].flatMap(t => ['tripoli','cairo'].map(b => `alert_${b}_${t}_${today}`));
  for (const k of keys){
    try {
      await sb(`att_settings?key=eq.${k}`, { method:'DELETE' });
    } catch(_){}
  }
  alert('✅ تم إعادة التعيين. ستفير التنبيهات من جديد عند الأوقات المحددة.');
}

async function sendPushNow(){
  const title = document.getElementById('push-title').value.trim();
  const body  = document.getElementById('push-body').value.trim();
  if (!title) return alert('اكتب عنوان الإشعار');
  try {
    const r = await sendBroadcastPush(title, body);
    alert(`✅ تم الإرسال — أرسل إلى ${r.sent} من أصل ${r.total} مشترك`);
    document.getElementById('push-title').value = '';
    document.getElementById('push-body').value = '';
  } catch(e){ alert('فشل: '+e.message); }
}

// ============= Monthly Reports =============
const ROLE_AR = {bookings:'حجوزات تذاكر/فنادق',visas:'تأشيرات',finance:'مالي',delegate:'مندوب',manager:'مدير',agent:'موظف حجوزات',guide:'مرشد',driver:'سائق'};

async function loadReport(){
  const monthEl = document.getElementById('rep-month');
  if (!monthEl) return;
  const ym = monthEl.value || new Date().toISOString().slice(0,7);
  const [y,m] = ym.split('-').map(Number);
  const start = new Date(Date.UTC(y, m-1, 1)).toISOString();
  const end   = new Date(Date.UTC(y, m, 1)).toISOString();
  document.getElementById('rep-table').innerHTML = `<tr><td colspan="6" class="p-6 text-center text-outline">جاري التحميل...</td></tr>`;
  let logs;
  try {
    logs = await sb(`att_logs?check_in=gte.${start}&check_in=lt.${end}&order=check_in.asc&select=employee_id,check_in,duration_min,note,att_employees!att_logs_employee_id_fkey(name,role,branch,active)`);
  } catch(e){
    document.getElementById('rep-table').innerHTML = `<tr><td colspan="6" class="p-6 text-error">فشل: ${e.message}</td></tr>`;
    return;
  }
  // Aggregate
  const sum = {};
  let totalMins = 0, totalAuto = 0;
  for (const l of (logs||[])){
    const e = l.att_employees||{};
    if (!sum[l.employee_id]) sum[l.employee_id] = { name:e.name||'?', role:e.role||'', branch:e.branch||'', days:new Set(), mins:0, auto:0, logs:0 };
    const s = sum[l.employee_id];
    s.logs++;
    if (l.duration_min) { s.mins += l.duration_min; totalMins += l.duration_min; }
    s.days.add(l.check_in.slice(0,10));
    if ((l.note||'').includes('تلقائياً')) { s.auto++; totalAuto++; }
  }
  const rows = Object.values(sum).sort((a,b)=>b.mins-a.mins);
  window._reportData = { ym, rows, totalMins, totalAuto, totalLogs: logs?.length||0 };
  // Summary cards
  const totalH = Math.floor(totalMins/60), totalM = totalMins%60;
  const autoPct = logs?.length ? Math.round(totalAuto/logs.length*100) : 0;
  document.getElementById('rep-summary').innerHTML = `
    <div class="bg-white p-4 rounded-2xl border border-outline-variant/30">
      <p class="text-xs text-outline">إجمالي السجلات</p>
      <p class="text-2xl font-extrabold text-primary">${logs?.length||0}</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-outline-variant/30">
      <p class="text-xs text-outline">إجمالي الساعات</p>
      <p class="text-2xl font-extrabold text-tertiary">${totalH}h ${String(totalM).padStart(2,'0')}m</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-outline-variant/30">
      <p class="text-xs text-outline">عدد الموظفين النشطين</p>
      <p class="text-2xl font-extrabold text-secondary">${rows.length}</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-outline-variant/30">
      <p class="text-xs text-outline">انصراف تلقائي</p>
      <p class="text-2xl font-extrabold text-error">${totalAuto} <span class="text-sm opacity-70">(${autoPct}%)</span></p>
    </div>`;
  // Table
  document.getElementById('rep-count').textContent = `${rows.length} موظف`;
  document.getElementById('rep-table').innerHTML = rows.map(s => {
    const h = Math.floor(s.mins/60), mm = s.mins%60;
    const avg = s.days.size ? Math.round(s.mins/s.days.size) : 0;
    const ah = Math.floor(avg/60), am = avg%60;
    const autoColor = s.auto>=5?'text-error font-bold':s.auto>=2?'text-secondary':'text-on-surface-variant';
    return `<tr class="border-b border-outline-variant/20">
      <td class="p-3">
        <p class="font-bold">${s.name}</p>
        <p class="text-xs text-outline">${ROLE_AR[s.role]||s.role}</p>
      </td>
      <td class="p-3 text-xs">${s.branch}</td>
      <td class="p-3 text-center">${s.days.size}</td>
      <td class="p-3 text-center font-bold text-primary">${h}h ${String(mm).padStart(2,'0')}m</td>
      <td class="p-3 text-center text-xs">${ah}h ${String(am).padStart(2,'0')}m</td>
      <td class="p-3 text-center ${autoColor}">${s.auto}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="p-6 text-center text-outline">لا توجد بيانات</td></tr>`;
}

function exportReport(){
  const d = window._reportData;
  if (!d || !d.rows.length) return alert('لا توجد بيانات');
  const csv = [['Employee','Role','Branch','Days','Total Hours','Average/Day','Auto Check-out','Logs']];
  for (const s of d.rows){
    const h = Math.floor(s.mins/60), mm = s.mins%60;
    const avg = s.days.size ? Math.round(s.mins/s.days.size) : 0;
    const ah = Math.floor(avg/60), am = avg%60;
    csv.push([s.name, ROLE_AR[s.role]||s.role, s.branch, s.days.size, `${h}h ${mm}m`, `${ah}h ${am}m`, s.auto, s.logs]);
  }
  const text = csv.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿'+text],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`alyame_report_${d.ym}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Opens report in new window and triggers print dialog (user chooses "Save as PDF")
function openPrintWindow(title, bodyHtml){
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return alert('المتصفح يمنع فتح النوافذ — اسمح بالنوافذ المنبثقة لهذا الموقع ثم حاول مجدداً');
  w.document.open();
  w.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Tahoma, Arial, "Segoe UI", sans-serif; margin:0; color:#222; background:#fff; line-height:1.4 }
  table { border-collapse: collapse; width: 100%; }
  .no-print { display:block; position:sticky; top:0; background:#00355f; color:#fff; padding:12px; text-align:center; z-index:100 }
  .no-print button { background:#fff; color:#00355f; border:0; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; margin:0 4px; font-size:14px }
  @media print { .no-print { display:none !important } }
  .avoid-break { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="no-print">
  <span style="font-weight:bold;margin-end:12px">جاهز للطباعة / حفظ كـ PDF</span>
  <button onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <button onclick="window.close()">إغلاق</button>
</div>
${bodyHtml}
<script>
  // Auto-trigger print after a moment
  setTimeout(() => { try { window.print(); } catch(e){} }, 800);
<\/script>
</body></html>`);
  w.document.close();
}

// Summary PDF
function exportReportPDF(){
  const d = window._reportData;
  if (!d || !d.rows.length) return alert('لا توجد بيانات. اضغط "عرض" أولاً');
  const monthLabel = new Date(d.ym+'-01').toLocaleDateString('ar-LY',{month:'long',year:'numeric'});
  const totalH = Math.floor(d.totalMins/60), totalM = d.totalMins%60;
  const autoPct = d.totalLogs ? Math.round(d.totalAuto/d.totalLogs*100) : 0;
  const rowsHtml = d.rows.map((s,i) => {
    const h = Math.floor(s.mins/60), mm = s.mins%60;
    const avg = s.days.size ? Math.round(s.mins/s.days.size) : 0;
    const ah = Math.floor(avg/60), am = avg%60;
    const autoColor = s.auto>=5?'#c62828':s.auto>=2?'#e65100':'#666';
    return `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${i+1}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee"><b>${s.name}</b><br><span style="font-size:11px;color:#888">${ROLE_AR[s.role]||s.role||''}</span></td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:12px">${s.branch}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center">${s.days.size}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;color:#00355f">${h}س ${String(mm).padStart(2,'0')}د</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;font-size:12px">${ah}س ${String(am).padStart(2,'0')}د</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;text-align:center;color:${autoColor};font-weight:${s.auto>=5?'bold':'normal'}">${s.auto}</td>
    </tr>`;
  }).join('');
  const body = `<div style="padding:16px">
    <div style="background:linear-gradient(135deg,#00355f,#0f4c81,#003a3d);color:#fff;padding:24px;border-radius:12px;text-align:center;margin-bottom:20px">
      <h1 style="margin:0;font-size:22px">📊 تقرير الحضور الشهري</h1>
      <p style="margin:6px 0 0;font-size:14px">شركة اليامي للسفر والسياحة</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:bold">${monthLabel}</p>
    </div>
    <table style="margin-bottom:16px"><tr>
      <td style="width:25%;padding:4px"><div style="background:#e3f2fd;padding:14px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#1565c0;font-weight:bold">السجلات</div><div style="font-size:24px;font-weight:bold;color:#0d47a1">${d.totalLogs}</div></div></td>
      <td style="width:25%;padding:4px"><div style="background:#e0f2f1;padding:14px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#00695c;font-weight:bold">الساعات</div><div style="font-size:18px;font-weight:bold;color:#004d40">${totalH}س ${String(totalM).padStart(2,'0')}د</div></div></td>
      <td style="width:25%;padding:4px"><div style="background:#fff3e0;padding:14px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#e65100;font-weight:bold">الموظفون</div><div style="font-size:24px;font-weight:bold;color:#bf360c">${d.rows.length}</div></div></td>
      <td style="width:25%;padding:4px"><div style="background:#ffebee;padding:14px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#c62828;font-weight:bold">انصراف تلقائي</div><div style="font-size:18px;font-weight:bold;color:#b71c1c">${d.totalAuto} (${autoPct}%)</div></div></td>
    </tr></table>
    <table style="font-size:12px">
      <thead><tr style="background:#00355f;color:#fff">
        <th style="padding:10px 6px;text-align:center">#</th>
        <th style="padding:10px 6px;text-align:start">الموظف</th>
        <th style="padding:10px 6px;text-align:start">الفرع</th>
        <th style="padding:10px 6px;text-align:center">أيام</th>
        <th style="padding:10px 6px;text-align:center">الساعات</th>
        <th style="padding:10px 6px;text-align:center">متوسط/يوم</th>
        <th style="padding:10px 6px;text-align:center">انصراف تلقائي</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p style="margin-top:24px;font-size:10px;color:#888;text-align:center">© ${new Date().getFullYear()} شركة اليامي للسفر والسياحة · تم التوليد ${new Date().toLocaleString('en-GB')}</p>
  </div>`;
  openPrintWindow(`alyame_report_${d.ym}`, body);
}

// Detailed PDF - per-employee daily breakdown
async function exportDetailedPDF(){
  const d = window._reportData;
  if (!d || !d.rows.length) return alert('لا توجد بيانات. اضغط "عرض" أولاً');
  const ym = d.ym;
  const [y, mm] = ym.split('-').map(Number);
  const start = new Date(Date.UTC(y, mm-1, 1)).toISOString();
  const end = new Date(Date.UTC(y, mm, 1)).toISOString();
  // Fetch all logs for the month
  const allLogs = await sb(`att_logs?check_in=gte.${start}&check_in=lt.${end}&order=check_in.asc&select=employee_id,check_in,check_out,duration_min,location_in,note,att_employees!att_logs_employee_id_fkey(name,role,branch,phone)`);
  // Group by employee + day
  const byEmp = {};
  for (const l of (allLogs||[])){
    const e = l.att_employees||{};
    if (!byEmp[l.employee_id]) byEmp[l.employee_id] = {name:e.name||'?',role:e.role||'',branch:e.branch||'',phone:e.phone||'',days:{},logs:[],mins:0,auto:0};
    byEmp[l.employee_id].logs.push(l);
    const dk = l.check_in.slice(0,10);
    if (!byEmp[l.employee_id].days[dk]) byEmp[l.employee_id].days[dk] = [];
    byEmp[l.employee_id].days[dk].push(l);
    if (l.duration_min) byEmp[l.employee_id].mins += l.duration_min;
    if ((l.note||'').includes('تلقائياً')) byEmp[l.employee_id].auto++;
  }
  const employees = Object.values(byEmp).sort((a,b)=>b.mins-a.mins);
  const monthLabel = new Date(ym+'-01').toLocaleDateString('ar-LY',{month:'long',year:'numeric'});

  const fmtTime = s => { const dt = new Date(s); return dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}); };
  const dayName = s => new Date(s).toLocaleDateString('ar-LY',{weekday:'long'});
  const fmtDur = m => m ? Math.floor(m/60)+'س '+String(m%60).padStart(2,'0')+'د' : '—';

  const sections = employees.map((e,idx) => {
    const totalH = Math.floor(e.mins/60), totalM = e.mins%60;
    const dayKeys = Object.keys(e.days).sort();
    const avg = dayKeys.length ? Math.round(e.mins/dayKeys.length) : 0;
    const autoRate = e.logs.length ? Math.round(e.auto/e.logs.length*100) : 0;
    const dayRows = dayKeys.map(dk => {
      const entries = e.days[dk];
      return entries.map((l,i) => `<tr style="font-size:11px">
        ${i===0?`<td rowspan="${entries.length}" style="padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top;font-weight:bold;color:#00355f">${dk}<br><span style="font-size:9px;color:#888;font-weight:normal">${dayName(l.check_in)}</span></td>`:''}
        <td style="padding:6px 8px;border-bottom:1px solid #eee" dir="ltr">${fmtTime(l.check_in)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee" dir="ltr">${l.check_out?fmtTime(l.check_out):'—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${fmtDur(l.duration_min)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:10px;color:#666">${(l.location_in||'').slice(0,30)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-size:14px">${(l.note||'').includes('تلقائياً')?'<span style="color:#c62828">⚠</span>':'<span style="color:#2e7d32">✓</span>'}</td>
      </tr>`).join('');
    }).join('');
    return `<div class="avoid-break" style="margin:16px 0;border:1px solid #ddd;border-radius:8px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#00355f,#0f4c81);color:#fff;padding:12px 14px">
        <table style="width:100%"><tr>
          <td>
            <div style="font-size:11px;opacity:.85">#${idx+1} · ${ROLE_AR[e.role]||e.role||''}</div>
            <div style="font-size:15px;font-weight:bold">${e.name}</div>
            <div style="font-size:10px;opacity:.85" dir="ltr">${e.phone||''} · ${e.branch}</div>
          </td>
          <td style="text-align:end">
            <div style="font-size:18px;font-weight:bold">${totalH}<span style="font-size:11px">س ${String(totalM).padStart(2,'0')}د</span></div>
            <div style="font-size:9px;opacity:.85">إجمالي</div>
          </td>
        </tr></table>
        <table style="width:100%;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.2);font-size:10px"><tr>
          <td style="text-align:center"><b>${dayKeys.length}</b><br><span style="opacity:.8">أيام</span></td>
          <td style="text-align:center"><b>${e.logs.length}</b><br><span style="opacity:.8">سجلات</span></td>
          <td style="text-align:center"><b>${fmtDur(avg)}</b><br><span style="opacity:.8">متوسط</span></td>
          <td style="text-align:center"><b>${e.auto} (${autoRate}%)</b><br><span style="opacity:.8">تلقائي</span></td>
        </tr></table>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f5f5f5;font-size:10px">
          <th style="padding:8px 6px;text-align:start">التاريخ</th>
          <th style="padding:8px 6px;text-align:start">الحضور</th>
          <th style="padding:8px 6px;text-align:start">الانصراف</th>
          <th style="padding:8px 6px;text-align:start">المدة</th>
          <th style="padding:8px 6px;text-align:start">الموقع</th>
          <th style="padding:8px 6px;text-align:center">النوع</th>
        </tr></thead>
        <tbody>${dayRows}</tbody>
      </table>
    </div>`;
  }).join('');

  const body = `<div style="padding:12px">
    <div style="background:linear-gradient(135deg,#00355f,#0f4c81,#003a3d);color:#fff;padding:24px;border-radius:12px;text-align:center;margin-bottom:16px">
      <h1 style="margin:0;font-size:22px">📊 تقرير الحضور المفصّل</h1>
      <p style="margin:6px 0 0">شركة اليامي للسفر والسياحة</p>
      <p style="margin:4px 0 0;font-size:18px;font-weight:bold">${monthLabel}</p>
    </div>
    ${sections}
    <p style="margin-top:20px;font-size:10px;color:#888;text-align:center">© ${new Date().getFullYear()} شركة اليامي · ${new Date().toLocaleString('en-GB')}</p>
  </div>`;
  openPrintWindow(`alyame_detailed_${ym}`, body);
}

async function loadReportEmail(){
  const s = await loadSettings();
  const el = document.getElementById('rep-email');
  if (el) el.value = s.report_email || '';
}

async function sendMonthlyEmail(){
  const email = document.getElementById('rep-email').value.trim();
  if (!email) return alert('أدخل البريد الإلكتروني');
  // Save email to settings
  try {
    await sb('att_settings', {
      method:'POST',
      headers:{ 'Prefer':'resolution=merge-duplicates,return=minimal' },
      body:[{ key:'report_email', value:email }]
    });
  } catch(_){}
  const month = document.getElementById('rep-month').value || new Date().toISOString().slice(0,7);
  try {
    const r = await fetch(`${SB_URL}/functions/v1/monthly-report`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+SB_KEY, 'apikey':SB_KEY },
      body: JSON.stringify({ email, month })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error||'failed');
    alert(`✅ تم إرسال التقرير إلى ${email}`);
  } catch(e){ alert('فشل: '+e.message); }
}

function useMyLocation(branch){
  if (!navigator.geolocation) return alert('GPS غير متاح');
  navigator.geolocation.getCurrentPosition(p => {
    const lat = p.coords.latitude, lng = p.coords.longitude;
    document.getElementById(`set-${branch}-lat`).value = lat.toFixed(6);
    document.getElementById(`set-${branch}-lng`).value = lng.toFixed(6);
    const m = _branchMaps && _branchMaps[branch];
    if (m){
      m.marker.setLatLng([lat, lng]);
      m.circle.setLatLng([lat, lng]);
      m.map.setView([lat, lng], 17);
    }
    toast('تم استخدام موقعك','success');
  }, e => alert('فشل تحديد الموقع: '+e.message), { enableHighAccuracy:true });
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

  // Wire request filter buttons
  document.querySelectorAll('[data-rfilter]').forEach(b => {
    b.onclick = () => {
      window._reqFilter = b.dataset.rfilter;
      document.querySelectorAll('[data-rfilter]').forEach(x => {
        const a = x.dataset.rfilter === b.dataset.rfilter;
        x.classList.toggle('bg-primary', a); x.classList.toggle('text-white', a);
        x.classList.toggle('bg-surface-container', !a);
      });
      loadAdminRequests(b.dataset.rfilter);
    };
  });

  await refreshStats();
  await refreshPendingBadge();
  switchTab('employees');
  // Auto-refresh pending requests count every 30s
  setInterval(refreshPendingBadge, 30000);
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
  if (tab==='requests') loadAdminRequests(window._reqFilter||'pending');
  if (tab==='settings') loadAdminSettings();
  if (tab==='reports') {
    const m = document.getElementById('rep-month');
    if (m && !m.value) m.value = new Date().toISOString().slice(0,7);
    loadReport();
    loadReportEmail();
  }
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
  // Fetch which employees have active push subscriptions
  let pushSet = new Set();
  try {
    const subs = await sb('att_push_subs?select=employee_id');
    pushSet = new Set((subs||[]).map(s => s.employee_id));
  } catch(_){}
  window._pushSet = pushSet;
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
      <div class="flex items-center gap-2 ${e.is_admin?'text-white/90':''}">
        ${(window._pushSet && window._pushSet.has(e.id))
          ? `<span class="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full ${e.is_admin?'bg-white/20':'bg-tertiary-fixed text-tertiary'}"><span class="material-symbols-outlined text-[14px]">notifications_active</span>الإشعارات مفعّلة</span>`
          : `<span class="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full ${e.is_admin?'bg-white/20':'bg-error-container text-error'}"><span class="material-symbols-outlined text-[14px]">notifications_off</span>إشعارات غير مفعّلة</span>`}
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
  // split stored phone into cc + local for display
  const ccSel = document.getElementById('emp-cc');
  const phoneInput = document.getElementById('emp-phone');
  const stored = e?.phone || '';
  if (stored && stored.toLowerCase()!=='admin') {
    const d = stored.replace(/\D/g,'');
    let matched = false;
    for (const c of COUNTRY_CODES) {
      if (d.startsWith(c)) { if (ccSel) ccSel.value = '+'+c; phoneInput.value = d.slice(c.length); matched = true; break; }
    }
    if (!matched) { if (ccSel) ccSel.value = ''; phoneInput.value = stored; }
  } else {
    phoneInput.value = stored;
  }
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
  let phoneRaw = document.getElementById('emp-phone').value.trim();
  const empCcEl = document.getElementById('emp-cc');
  const empCc = empCcEl ? empCcEl.value : '';
  let phone;
  if (phoneRaw.toLowerCase()==='admin') {
    phone = 'admin';
  } else if (empCc && !phoneRaw.startsWith('+')) {
    phone = empCc + phoneRaw.replace(/^0/,'').replace(/\s/g,'');
  } else {
    phone = phoneRaw;
  }
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

window.App = { initLogin, initDashboard, initHistory, initAdmin, showDetails, editLog, deleteLog, decideRequest, saveSettings, useMyLocation, sendPushNow, sendTestPushToMe, resetTodayAlerts, enableNotifications, showNotifGuide, testMyNotification, loadReport, exportReport, exportReportPDF, exportDetailedPDF, sendMonthlyEmail, retryLocation, state };
})();
