const fs = require('fs');
const logs = JSON.parse(fs.readFileSync('may.json','utf8'));
const ROLE = {bookings:'حجوزات تذاكر/فنادق',visas:'تأشيرات',finance:'القسم المالي',delegate:'مندوب',manager:'مدير',agent:'موظف حجوزات',guide:'مرشد سياحي',driver:'سائق'};
const TZ = 'Africa/Tripoli';
const fmtTime = d => new Date(d).toLocaleTimeString('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false});
const fmtDate = d => new Date(d).toLocaleDateString('en-CA',{timeZone:TZ});
const dayName = d => new Date(d).toLocaleDateString('ar-LY',{timeZone:TZ,weekday:'long'});
const fmtDur = m => m ? Math.floor(m/60)+'س '+String(m%60).padStart(2,'0')+'د' : '—';

const emp = {};
for (const l of logs){
  const e = l.att_employees||{};
  const k = l.employee_id;
  if (!emp[k]) emp[k] = {name:e.name||'?',role:e.role||'',branch:e.branch||'',phone:e.phone||'',days:{},logs:[],mins:0,auto:0};
  emp[k].logs.push(l);
  const d = fmtDate(l.check_in);
  if (!emp[k].days[d]) emp[k].days[d] = {mins:0,auto:0,logs:[]};
  emp[k].days[d].logs.push(l);
  if (l.duration_min) { emp[k].days[d].mins += l.duration_min; emp[k].mins += l.duration_min; }
  if ((l.note||'').includes('تلقائياً')) { emp[k].days[d].auto++; emp[k].auto++; }
}
const employees = Object.values(emp).sort((a,b)=>b.mins-a.mins);
const totalMins = employees.reduce((s,e)=>s+e.mins,0);
const totalAuto = employees.reduce((s,e)=>s+e.auto,0);
const totalLogs = logs.length;
const autoPct = Math.round(totalAuto/totalLogs*100);

const branches = {};
for (const e of employees){
  const b = e.branch || '-';
  if (!branches[b]) branches[b] = {emps:0,mins:0,logs:0,auto:0,days:0};
  branches[b].emps++; branches[b].mins+=e.mins; branches[b].logs+=e.logs.length;
  branches[b].auto+=e.auto; branches[b].days+=Object.keys(e.days).length;
}

const css = 'font-family:Tahoma,Arial,sans-serif;line-height:1.4';
const td = 'padding:6px 10px;border-bottom:1px solid #e8e8ee;font-size:13px';
const th = 'padding:10px 8px;background:#00355f;color:#fff;text-align:start;font-size:12px;font-weight:bold';

const empSections = employees.map((e,idx)=>{
  const totalH = Math.floor(e.mins/60), totalM = e.mins%60;
  const daysSorted = Object.keys(e.days).sort();
  const avg = daysSorted.length ? Math.round(e.mins/daysSorted.length) : 0;
  const autoRate = e.logs.length ? Math.round(e.auto/e.logs.length*100) : 0;
  const dayRows = daysSorted.map(d=>{
    const dd = e.days[d];
    return dd.logs.map((l,i)=>`<tr>
      ${i===0?`<td rowspan="${dd.logs.length}" style="${td};vertical-align:top;font-weight:bold;color:#00355f">${d}<br><span style="font-size:11px;color:#888;font-weight:normal">${dayName(l.check_in)}</span></td>`:''}
      <td style="${td}" dir="ltr">${fmtTime(l.check_in)}</td>
      <td style="${td}" dir="ltr">${l.check_out?fmtTime(l.check_out):'<span style="color:#c62828">-</span>'}</td>
      <td style="${td}">${fmtDur(l.duration_min)}</td>
      <td style="${td};font-size:11px;color:#666">${(l.location_in||'').slice(0,40)}</td>
      <td style="${td};text-align:center">${(l.note||'').includes('تلقائياً')?'<span style="color:#c62828;font-size:16px">A</span>':'<span style="color:#2e7d32">M</span>'}</td>
    </tr>`).join('');
  }).join('');
  const badgeNum = idx===0?'1':idx===1?'2':idx===2?'3':(idx+1);
  return `<div style="margin:24px 0;background:#fff;border:1px solid #e0e0e8;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#00355f,#0f4c81);color:#fff;padding:16px 20px">
      <div style="display:table;width:100%">
        <div style="display:table-cell;vertical-align:middle">
          <div style="font-size:13px;opacity:.8">#${badgeNum} - ${ROLE[e.role]||e.role||''}</div>
          <div style="font-size:18px;font-weight:bold;margin-top:2px">${e.name}</div>
          <div style="font-size:11px;opacity:.85;margin-top:2px" dir="ltr">${e.phone||''} - ${e.branch}</div>
        </div>
        <div style="display:table-cell;vertical-align:middle;text-align:end">
          <div style="font-size:24px;font-weight:bold">${totalH}<span style="font-size:14px">س ${String(totalM).padStart(2,'0')}د</span></div>
          <div style="font-size:11px;opacity:.85">إجمالي الساعات</div>
        </div>
      </div>
      <table style="width:100%;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.2)"><tr>
        <td style="text-align:center;width:25%"><div style="font-size:18px;font-weight:bold">${daysSorted.length}</div><div style="font-size:10px;opacity:.8">أيام عمل</div></td>
        <td style="text-align:center;width:25%"><div style="font-size:18px;font-weight:bold">${e.logs.length}</div><div style="font-size:10px;opacity:.8">عدد السجلات</div></td>
        <td style="text-align:center;width:25%"><div style="font-size:18px;font-weight:bold">${fmtDur(avg)}</div><div style="font-size:10px;opacity:.8">متوسط/يوم</div></td>
        <td style="text-align:center;width:25%"><div style="font-size:18px;font-weight:bold;${autoRate>50?'color:#ffcdd2':''}">${e.auto} (${autoRate}%)</div><div style="font-size:10px;opacity:.8">انصراف تلقائي</div></td>
      </tr></table>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="${th}">التاريخ</th>
        <th style="${th}">الحضور</th>
        <th style="${th}">الانصراف</th>
        <th style="${th}">المدة</th>
        <th style="${th}">الموقع</th>
        <th style="${th};text-align:center">النوع</th>
      </tr></thead>
      <tbody>${dayRows}</tbody>
    </table>
  </div>`;
}).join('');

const branchHtml = Object.entries(branches).sort((a,b)=>b[1].mins-a[1].mins).map(([n,b])=>{
  const h=Math.floor(b.mins/60),m=b.mins%60;
  return `<tr>
    <td style="${td};font-weight:bold">${n}</td>
    <td style="${td};text-align:center">${b.emps}</td>
    <td style="${td};text-align:center">${b.days}</td>
    <td style="${td};text-align:center;font-weight:bold;color:#00355f">${h}س ${String(m).padStart(2,'0')}د</td>
    <td style="${td};text-align:center">${b.logs}</td>
    <td style="${td};text-align:center;color:${b.auto>20?'#c62828':'#666'}">${b.auto}</td>
  </tr>`;
}).join('');

const heavyAuto = employees.filter(e=>e.logs.length>0 && (e.auto/e.logs.length)>=0.5).map(e=>{
  const r = Math.round(e.auto/e.logs.length*100);
  return `<li style="margin:4px 0"><b>${e.name}</b> (${e.branch}) - ${e.auto}/${e.logs.length} = <span style="color:#c62828;font-weight:bold">${r}%</span></li>`;
}).join('');

const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير حضور مفصل - مايو 2026</title></head>
<body style="${css};background:#f0f2f5;margin:0;padding:20px;color:#222">
<div style="max-width:900px;margin:0 auto">

<div style="background:linear-gradient(135deg,#00355f 0%,#0f4c81 50%,#003a3d 100%);color:#fff;padding:32px;border-radius:16px;text-align:center;margin-bottom:20px">
  <div style="font-size:36px">REPORT</div>
  <h1 style="margin:8px 0 4px;font-size:28px;font-weight:800">التقرير الشهري المفصل</h1>
  <div style="font-size:16px;opacity:.95">شركة اليامي للسفر والسياحة</div>
  <div style="font-size:14px;opacity:.85;margin-top:4px" dir="ltr">Alyame Travel and Tourism</div>
  <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:24px;padding:8px 20px;margin-top:16px;font-size:18px;font-weight:bold">شهر مايو 2026 / May 2026</div>
</div>

<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px">
  <h2 style="margin:0 0 16px;color:#00355f;font-size:18px">الملخص التنفيذي</h2>
  <table style="width:100%"><tr>
    <td style="width:25%;padding:4px"><div style="background:#e3f2fd;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#1565c0;font-weight:bold">إجمالي السجلات</div><div style="font-size:28px;font-weight:800;color:#0d47a1;margin-top:4px">${totalLogs}</div></div></td>
    <td style="width:25%;padding:4px"><div style="background:#e0f2f1;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#00695c;font-weight:bold">إجمالي الساعات</div><div style="font-size:24px;font-weight:800;color:#004d40;margin-top:4px">${Math.floor(totalMins/60)}س ${String(totalMins%60).padStart(2,'0')}د</div></div></td>
    <td style="width:25%;padding:4px"><div style="background:#fff3e0;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#e65100;font-weight:bold">الموظفون النشطون</div><div style="font-size:28px;font-weight:800;color:#bf360c;margin-top:4px">${employees.length}</div></div></td>
    <td style="width:25%;padding:4px"><div style="background:#ffebee;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#c62828;font-weight:bold">انصراف تلقائي</div><div style="font-size:24px;font-weight:800;color:#b71c1c;margin-top:4px">${totalAuto} <span style="font-size:14px">(${autoPct}%)</span></div></div></td>
  </tr></table>
</div>

<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px">
  <h2 style="margin:0 0 12px;color:#00355f;font-size:18px">توزيع حسب الفروع</h2>
  <table style="width:100%;border-collapse:collapse">
    <thead><tr>
      <th style="${th}">الفرع</th>
      <th style="${th};text-align:center">موظفون</th>
      <th style="${th};text-align:center">أيام عمل</th>
      <th style="${th};text-align:center">الساعات</th>
      <th style="${th};text-align:center">السجلات</th>
      <th style="${th};text-align:center">انصراف تلقائي</th>
    </tr></thead>
    <tbody>${branchHtml}</tbody>
  </table>
</div>

${heavyAuto?`<div style="background:#fff3e0;border-right:4px solid #e65100;border-radius:8px;padding:16px;margin-bottom:20px">
  <h3 style="margin:0 0 8px;color:#bf360c;font-size:15px">تنبيه: موظفون بمعدل انصراف تلقائي مرتفع (50% فأكثر)</h3>
  <ul style="margin:0;padding-inline-start:20px;color:#555;font-size:13px">${heavyAuto}</ul>
  <p style="margin:10px 0 0;font-size:12px;color:#777">يُنصح بمراجعة هؤلاء الموظفين وتذكيرهم بأهمية تسجيل الانصراف يدوياً قبل المغادرة.</p>
</div>`:''}

<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px">
  <h2 style="margin:0 0 8px;color:#00355f;font-size:18px">التفصيل الكامل لكل موظف</h2>
  <p style="margin:0 0 16px;font-size:12px;color:#888">مرتّبون من الأكثر ساعات إلى الأقل · M = انصراف يدوي · A = انصراف تلقائي</p>
  ${empSections}
</div>

<div style="background:#fff;border-radius:12px;padding:20px;text-align:center;color:#666;font-size:12px">
  <p style="margin:0 0 8px">نظام الحضور الإلكتروني - <a href="https://al76yame-dot.github.io/alyame-attendance/" style="color:#00355f">رابط التطبيق</a></p>
  <p style="margin:0">شركة اليامي للسفر والسياحة - جميع الحقوق محفوظة</p>
  <p style="margin:8px 0 0;font-size:11px;opacity:.7" dir="ltr">Generated on ${new Date().toLocaleString('en-GB',{timeZone:TZ})}</p>
</div>

</div></body></html>`;

fs.writeFileSync('detailed_may_report.html', html);
console.log('HTML size:', html.length);
console.log('Employees:', employees.length);
console.log('Total logs:', totalLogs);
console.log('Total hours:', Math.floor(totalMins/60));
