// Alyame Travel & Tourism — Attendance App
(function(){
const LS_USER='alyame_user', LS_LOGS='alyame_logs', LS_LANG='alyame_lang';

const I18N = {
  ar: {
    'login.subtitle':'شركة اليامي للسفر والسياحة — سجّل دخولك لنظام الحضور',
    'login.name':'الاسم الكامل','login.namePh':'مثال: غيث اليامي',
    'login.phone':'رقم الهاتف','login.role':'الدور الوظيفي',
    'login.remember':'تذكّرني','login.continue':'متابعة','login.support':'الدعم',
    'login.ctx.title':'جاهزية الجولات','login.ctx.desc':'تحقق تلقائي عبر GPS للمهام المجدولة',
    'role.agent':'موظف حجوزات','role.guide':'مرشد سياحي','role.manager':'مدير فرع','role.driver':'سائق',
    'loc.pending':'جاري تحديد الموقع...','verify.ok':'تم التحقق من الموقع','verify.fail':'تعذّر تحديد الموقع',
    'hint.in':'اضغط لبدء نوبة عملك','hint.out':'اضغط لإنهاء نوبتك',
    'clock.in':'تسجيل الحضور','clock.out':'تسجيل الانصراف',
    'stat.hours':'ساعات العمل','stat.goal':'الهدف: ٨س','stat.last':'آخر حضور','stat.offline':'غير متصل','stat.online':'نشط الآن',
    'dash.live':'الموقع المباشر','dash.tracking':'تتبع مباشر','dash.recent':'النشاط الأخير','dash.empty':'لا يوجد نشاط بعد. ابدأ بتسجيل حضورك.',
    'log.start':'بداية المناوبة','log.end':'نهاية المناوبة','log.verified':'محقق','log.ongoing':'جارٍ','log.onsite':'في الموقع',
    'history.title':'سجل الحضور','history.sub':'مراجعة سجلات الحضور والمواقع الخاصة بك',
    'history.week':'آخر ٧ أيام','history.month':'هذا الشهر','history.custom':'نطاق مخصص',
    'history.ontime':'في الموعد','history.late':'متأخر','history.details':'تفاصيل','history.export':'تصدير التقرير',
    'history.empty':'لا توجد سجلات حضور بعد.',
    'nav.home':'الرئيسية','nav.map':'الخريطة','nav.history':'السجل','nav.profile':'الملف',
    'toast.in':'تم تسجيل حضورك بنجاح','toast.out':'تم تسجيل انصرافك. المدة: ',
    'toast.welcome':'أهلاً بك في نظام اليامي للحضور','toast.fillAll':'الرجاء تعبئة جميع الحقول',
    'confirm.logout':'تسجيل الخروج؟','confirm.clear':'هل أنت متأكد من مسح كامل السجل؟',
    'profile.title':'الملف الشخصي','profile.logout':'تسجيل الخروج','profile.clear':'مسح السجل','profile.lang':'اللغة',
  },
  en: {
    'login.subtitle':'Alyame Travel & Tourism — sign in to the attendance system',
    'login.name':'Full Name','login.namePh':'e.g. Ghaith Alyame',
    'login.phone':'Phone Number','login.role':'Role',
    'login.remember':'Remember me','login.continue':'Continue','login.support':'Support',
    'login.ctx.title':'Tour Ops Ready','login.ctx.desc':'Automatic GPS verification for scheduled assignments',
    'role.agent':'Booking Agent','role.guide':'Tour Guide','role.manager':'Branch Manager','role.driver':'Driver',
    'loc.pending':'Locating...','verify.ok':'Location verified','verify.fail':'Location unavailable',
    'hint.in':'Tap to start your shift','hint.out':'Tap to end your shift',
    'clock.in':'Check In','clock.out':'Check Out',
    'stat.hours':'Work Hours','stat.goal':'Goal: 8h 00m','stat.last':'Last Check-in','stat.offline':'Offline','stat.online':'Active now',
    'dash.live':'Live Location','dash.tracking':'Live Tracking','dash.recent':'Recent Activity','dash.empty':'No activity yet. Start by checking in.',
    'log.start':'Shift Started','log.end':'Shift Ended','log.verified':'VERIFIED','log.ongoing':'ONGOING','log.onsite':'On-Site',
    'history.title':'Attendance History','history.sub':'Review your check-in logs and locations',
    'history.week':'Last 7 Days','history.month':'This Month','history.custom':'Custom Range',
    'history.ontime':'On-Time','history.late':'Late','history.details':'Details','history.export':'Export Report',
    'history.empty':'No attendance records yet.',
    'nav.home':'Dashboard','nav.map':'Live Map','nav.history':'History','nav.profile':'Profile',
    'toast.in':'Checked in successfully','toast.out':'Checked out. Duration: ',
    'toast.welcome':'Welcome to Alyame Attendance','toast.fillAll':'Please fill all fields',
    'confirm.logout':'Log out?','confirm.clear':'Are you sure you want to clear all history?',
    'profile.title':'Profile','profile.logout':'Log out','profile.clear':'Clear History','profile.lang':'Language',
  }
};

const state = {
  lang: localStorage.getItem(LS_LANG) || 'ar',
  user: JSON.parse(localStorage.getItem(LS_USER)||'null'),
  logs: JSON.parse(localStorage.getItem(LS_LOGS)||'[]'),
  location: null
};

function save(){ localStorage.setItem(LS_USER, JSON.stringify(state.user)); localStorage.setItem(LS_LOGS, JSON.stringify(state.logs)); localStorage.setItem(LS_LANG, state.lang); }
function t(k){ return I18N[state.lang][k] ?? k; }

function applyLangDir(){
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang==='ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('.lang-btn').forEach(b => {
    const active = b.dataset.lang === state.lang;
    b.className = 'lang-btn px-4 py-1.5 rounded-full font-bold text-sm transition ' + (active ? 'bg-white text-primary shadow-sm' : 'text-white hover:bg-white/10');
  });
}

function fmtTime(d){ return new Date(d).toLocaleTimeString(state.lang==='ar'?'ar-LY':'en-US',{hour:'2-digit',minute:'2-digit',hour12:true}); }
function fmtTime24(d){ return new Date(d).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}); }
function fmtDateFull(d){ return new Date(d).toLocaleDateString(state.lang==='ar'?'ar-LY':'en-US',{weekday:'long',day:'numeric',month:'long'}); }
function fmtDur(ms){ const m=Math.max(0,Math.floor(ms/60000)); return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`; }
function initials(n){ if(!n) return 'A'; const p=n.trim().split(/\s+/); return (p[0][0]+(p[1]?.[0]||'')).toUpperCase(); }

function toast(msg, kind){
  const el = document.getElementById('toast'); if(!el) return;
  const bg = kind==='error' ? 'bg-error text-white' : kind==='info' ? 'bg-primary text-white' : 'bg-tertiary-container text-white';
  el.innerHTML = `<div class="toast ${bg} px-4 py-3 rounded-2xl shadow-2xl font-semibold text-center">${msg}</div>`;
  el.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(()=>el.classList.add('hidden'), 3000);
}

async function getLocation(){
  return new Promise(res => {
    if(!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({lat:p.coords.latitude, lng:p.coords.longitude, accuracy:p.coords.accuracy}),
      () => res(null),
      { enableHighAccuracy:true, timeout:8000, maximumAge:60000 }
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

function activeShift(){ return state.logs.find(l => !l.out); }

// ============= LOGIN =============
function initLogin(){
  // if already logged in, go dashboard
  if(state.user){ location.href = 'dashboard.html'; return; }
  applyLangDir();
  document.querySelectorAll('.lang-btn').forEach(b => b.onclick = () => { state.lang = b.dataset.lang; save(); applyLangDir(); });
  const form = document.getElementById('login-form');
  form.onsubmit = e => {
    e.preventDefault();
    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const role = document.getElementById('f-role').value;
    if(!name || !phone){ toast(t('toast.fillAll'),'error'); return; }
    state.user = { name, phone, role, remember: document.getElementById('f-remember').checked };
    save();
    location.href = 'dashboard.html';
  };
}

// ============= DASHBOARD =============
async function initDashboard(){
  if(!state.user){ location.href='index.html'; return; }
  applyLangDir();
  wireNav();
  wireLangToggle();
  document.getElementById('user-initials').textContent = initials(state.user.name);

  // Live clock
  const timeEl = document.getElementById('live-time');
  const dateEl = document.getElementById('live-date');
  const tick = () => {
    const d = new Date();
    timeEl.textContent = d.toLocaleTimeString(state.lang==='ar'?'ar-LY':'en-US',{hour:'2-digit',minute:'2-digit',hour12:true});
    dateEl.textContent = fmtDateFull(d);
  };
  tick(); setInterval(tick, 1000);

  // Location
  const locEl = document.getElementById('live-location');
  const verEl = document.getElementById('verify-status');
  locEl.textContent = t('loc.pending');
  const pos = await getLocation();
  if(pos){
    state.location = pos;
    const name = await reverse(pos.lat,pos.lng) || `${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`;
    state.location.name = name;
    locEl.textContent = name;
    verEl.innerHTML = `<span class="text-secondary font-semibold">${t('verify.ok')}</span>`;
    // live map tile
    const mapImg = document.getElementById('map-img');
    if(mapImg){
      const z=15, n=Math.pow(2,z);
      const x=Math.floor((pos.lng+180)/360*n);
      const la=pos.lat*Math.PI/180;
      const y=Math.floor((1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n);
      mapImg.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }
  } else {
    locEl.textContent = t('verify.fail');
    verEl.innerHTML = `<span class="text-error font-semibold">${t('verify.fail')}</span>`;
  }

  // Clock button
  const btn = document.getElementById('btn-clock');
  btn.onclick = () => {
    const open = activeShift();
    if(!open){
      state.logs.unshift({ id:'l_'+Date.now(), in:Date.now(), out:null, locIn: state.location, user: state.user.name });
      save(); toast(t('toast.in'),'success'); renderDashboard();
    } else {
      open.out = Date.now(); open.locOut = state.location; open.duration = open.out - open.in;
      save(); toast(t('toast.out') + fmtDur(open.duration),'info'); renderDashboard();
    }
  };

  renderDashboard();
  setInterval(() => { if(activeShift()) renderDashboard(); }, 30000);
}

function renderDashboard(){
  const open = activeShift();
  const btn = document.getElementById('btn-clock');
  const icon = document.getElementById('clock-icon');
  const lblAr = document.getElementById('clock-label-ar');
  const lblEn = document.getElementById('clock-label-en');
  const hint = document.getElementById('clock-hint');
  if(open){
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

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  let todayMs=0, lastIn=null;
  for(const l of state.logs){
    if(l.in >= todayStart.getTime()){
      const end = l.out || Date.now();
      todayMs += end-l.in;
      if(!lastIn || l.in > lastIn) lastIn = l.in;
    }
  }
  document.getElementById('stat-hours').textContent = fmtDur(todayMs);
  document.getElementById('stat-last').textContent = lastIn ? fmtTime(lastIn) : '--:--';
  document.getElementById('stat-status').textContent = (open ? t('stat.online') : t('stat.offline'));

  const list = document.getElementById('recent-list');
  const recent = state.logs.slice(0,3);
  if(!recent.length){
    list.innerHTML = `<div class="p-8 text-center bg-white rounded-2xl border border-dashed border-outline-variant/50 text-outline text-sm">${t('dash.empty')}</div>`;
  } else {
    list.innerHTML = recent.map(recentCard).join('');
  }
}

function recentCard(l){
  const ended = !!l.out;
  const title = ended ? t('log.end') : t('log.start');
  const when = fmtTime(ended ? l.out : l.in);
  const date = fmtDateFull(ended ? l.out : l.in);
  const dur = ended ? fmtDur(l.duration||(l.out-l.in)) : t('log.ongoing');
  const chip = ended
    ? `<span class="inline-block px-2 py-0.5 bg-tertiary-fixed-dim/30 text-tertiary text-[9px] font-bold rounded-full">${t('log.verified')}</span>`
    : `<span class="inline-block px-2 py-0.5 bg-surface-container-high text-outline text-[9px] font-bold rounded-full uppercase">${t('log.onsite')}</span>`;
  const iconBg = ended ? 'bg-blue-50 text-primary' : 'bg-orange-50 text-secondary';
  const iconName = ended ? 'history' : 'work';
  return `
    <div class="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100">
      <div class="w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0">
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

// ============= HISTORY =============
function initHistory(){
  if(!state.user){ location.href='index.html'; return; }
  applyLangDir();
  wireNav();
  wireLangToggle();
  document.getElementById('user-initials').textContent = initials(state.user.name);

  let filter = 'week';
  document.querySelectorAll('[data-filter]').forEach(b => {
    b.onclick = () => { filter = b.dataset.filter; updateFilterButtons(filter); renderHistory(filter); };
  });
  updateFilterButtons(filter);
  renderHistory(filter);

  document.getElementById('btn-export').onclick = exportCSV;
}

function updateFilterButtons(active){
  document.querySelectorAll('[data-filter]').forEach(b => {
    const on = b.dataset.filter === active;
    b.className = 'px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap ' + (on ? 'bg-primary text-white' : 'bg-surface-container text-on-surface');
  });
}

function renderHistory(filter){
  const now = Date.now();
  const from = filter==='week' ? now-7*864e5 : filter==='month' ? now-30*864e5 : 0;
  const logs = state.logs.filter(l => l.in >= from);
  const list = document.getElementById('history-list');
  if(!logs.length){
    list.innerHTML = `<div class="p-10 text-center bg-white rounded-3xl border border-dashed border-outline-variant/50 text-outline">${t('history.empty')}</div>`;
    return;
  }
  list.innerHTML = logs.map(historyCard).join('');
}

function historyCard(l){
  const ended = !!l.out;
  const inHr = new Date(l.in).getHours();
  const late = inHr >= 9;
  const statusChip = !ended
    ? `<span class="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-sm font-semibold">${t('log.ongoing')}</span>`
    : late
      ? `<span class="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant rounded-full text-sm font-semibold">${t('history.late')}</span>`
      : `<span class="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-sm font-semibold">${t('history.ontime')}</span>`;
  const locName = (l.locIn?.name) || '—';
  const mapUrl = l.locIn ? mapTileUrl(l.locIn.lat, l.locIn.lng) : 'assets/map-placeholder.svg';
  const checkout = ended ? `${fmtTime24(l.out)}` : '—';
  return `
    <div class="bg-white rounded-xl p-4 shadow-[0_4px_20px_rgba(15,76,129,0.08)] border border-outline-variant/40 flex flex-col gap-3">
      <div class="flex justify-between items-start">
        <div class="flex flex-col">
          <span class="text-xs text-outline uppercase tracking-wider font-semibold">${fmtDateFull(l.in)}</span>
          <div class="flex items-center gap-1 mt-1">
            <span class="material-symbols-outlined text-primary text-[18px]">schedule</span>
            <span class="text-lg font-bold text-primary">${fmtTime(l.in)}</span>
          </div>
        </div>
        ${statusChip}
      </div>
      <div class="flex gap-3 items-center bg-surface-container-low rounded-lg p-2">
        <div class="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-outline-variant bg-surface-container">
          <img class="w-full h-full object-cover" src="${mapUrl}" alt="map" onerror="this.style.display='none'"/>
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1">
            <span class="material-symbols-outlined text-secondary text-[16px]">location_on</span>
            <span class="text-sm font-semibold text-on-surface truncate">${locName}</span>
          </div>
          <p class="text-xs text-outline mt-1">GPS · ${l.locIn?.accuracy ? Math.round(l.locIn.accuracy)+'m' : (state.lang==='ar'?'بدون موقع':'No location')}</p>
        </div>
      </div>
      <div class="flex justify-between items-center pt-2 border-t border-surface-variant/30">
        <span class="text-xs text-on-surface-variant">${state.lang==='ar'?'انصراف':'Check-out'} ${checkout}${ended?' · '+fmtDur(l.duration||(l.out-l.in)):''}</span>
        <button class="text-primary text-sm font-semibold flex items-center gap-1" onclick="App.showDetails('${l.id}')">
          ${t('history.details')} <span class="material-symbols-outlined text-[16px] rtl:rotate-180">chevron_right</span>
        </button>
      </div>
    </div>`;
}

function mapTileUrl(lat,lng){
  const z=15, n=Math.pow(2,z);
  const x=Math.floor((lng+180)/360*n);
  const la=lat*Math.PI/180;
  const y=Math.floor((1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*n);
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function showDetails(id){
  const l = state.logs.find(x => x.id===id); if(!l) return;
  const info = [
    `${state.lang==='ar'?'الحضور':'Check-in'}: ${fmtTime24(l.in)}`,
    l.out ? `${state.lang==='ar'?'الانصراف':'Check-out'}: ${fmtTime24(l.out)}` : (state.lang==='ar'?'المناوبة جارية':'Shift ongoing'),
    l.out ? `${state.lang==='ar'?'المدة':'Duration'}: ${fmtDur(l.duration||(l.out-l.in))}` : '',
    l.locIn?.name ? `${state.lang==='ar'?'الموقع':'Location'}: ${l.locIn.name}` : ''
  ].filter(Boolean).join('\n');
  alert(info);
}

function exportCSV(){
  const rows = [['date','check_in','check_out','duration_minutes','location_in','location_out','lat_in','lng_in']];
  for(const l of state.logs){
    rows.push([
      new Date(l.in).toISOString().slice(0,10),
      fmtTime24(l.in),
      l.out?fmtTime24(l.out):'',
      l.out?Math.floor((l.out-l.in)/60000):'',
      l.locIn?.name||'',
      l.locOut?.name||'',
      l.locIn?.lat||'', l.locIn?.lng||''
    ]);
  }
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`alyame_attendance_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ============= Shared =============
function wireNav(){
  document.querySelectorAll('[data-nav]').forEach(b => {
    b.onclick = () => { location.href = b.dataset.nav; };
  });
}
function wireLangToggle(){
  document.querySelectorAll('[data-toggle-lang]').forEach(b => b.onclick = () => {
    state.lang = state.lang==='ar' ? 'en' : 'ar'; save(); location.reload();
  });
  document.querySelectorAll('[data-logout]').forEach(b => b.onclick = () => {
    if(!confirm(t('confirm.logout'))) return;
    localStorage.removeItem(LS_USER); state.user=null; location.href='index.html';
  });
  document.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => {
    if(!confirm(t('confirm.clear'))) return;
    state.logs=[]; save(); location.reload();
  });
}

window.App = { initLogin, initDashboard, initHistory, showDetails, state };
})();
