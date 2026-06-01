// Alyame Attendance — Monthly Report via Email (Resend)
// Required secrets: RESEND_API_KEY, RESEND_FROM (verified sender)
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") || "Alyame Attendance <onboarding@resend.dev>";
const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

const ROLE_AR: Record<string,string> = {
  bookings:"حجوزات تذاكر/فنادق", visas:"تأشيرات", finance:"مالي",
  delegate:"مندوب", manager:"مدير", agent:"موظف حجوزات", guide:"مرشد", driver:"سائق"
};

function ymRange(ym: string){
  const [y,m] = ym.split("-").map(Number);
  const start = new Date(Date.UTC(y, m-1, 1));
  const end   = new Date(Date.UTC(y, m, 1));
  return { start: start.toISOString(), end: end.toISOString(), label: start.toLocaleDateString("ar-LY",{month:"long",year:"numeric"}) };
}

function fmtHM(mins: number){
  const h = Math.floor(mins/60), m = mins%60;
  return `${h}س ${String(m).padStart(2,"0")}د`;
}

async function buildReport(ym: string){
  const { start, end, label } = ymRange(ym);
  const { data: logs, error } = await supa.from("att_logs")
    .select("employee_id,check_in,duration_min,note,att_employees!att_logs_employee_id_fkey(name,role,branch)")
    .gte("check_in", start).lt("check_in", end).order("check_in");
  if (error) throw error;

  const sum: Record<string, any> = {};
  let totalMins = 0, totalAuto = 0;
  for (const l of logs||[]){
    const e: any = l.att_employees || {};
    if (!sum[l.employee_id]) sum[l.employee_id] = { name:e.name||"؟", role:e.role||"", branch:e.branch||"", days:new Set<string>(), mins:0, auto:0, logs:0 };
    const s = sum[l.employee_id];
    s.logs++;
    if (l.duration_min) { s.mins += l.duration_min; totalMins += l.duration_min; }
    s.days.add(l.check_in.slice(0,10));
    if ((l.note||"").includes("تلقائياً")) { s.auto++; totalAuto++; }
  }
  const rows = Object.values(sum).sort((a:any,b:any)=>b.mins-a.mins);

  const totalH = Math.floor(totalMins/60), totalM = totalMins%60;
  const autoPct = logs?.length ? Math.round(totalAuto/logs.length*100) : 0;

  const rowsHtml = rows.map((s:any, i:number) => {
    const avg = s.days.size ? Math.round(s.mins/s.days.size) : 0;
    const autoStyle = s.auto>=5 ? "color:#c62828;font-weight:bold" : s.auto>=2 ? "color:#e65100" : "color:#666";
    return `<tr style="border-bottom:1px solid #eee">
      <td style="padding:8px 12px">${i+1}</td>
      <td style="padding:8px 12px"><b>${s.name}</b><br><span style="font-size:11px;color:#888">${ROLE_AR[s.role]||s.role||""}</span></td>
      <td style="padding:8px 12px;font-size:12px">${s.branch}</td>
      <td style="padding:8px 12px;text-align:center">${s.days.size}</td>
      <td style="padding:8px 12px;text-align:center;font-weight:bold;color:#00355f">${fmtHM(s.mins)}</td>
      <td style="padding:8px 12px;text-align:center;font-size:12px">${fmtHM(avg)}</td>
      <td style="padding:8px 12px;text-align:center;${autoStyle}">${s.auto}</td>
    </tr>`;
  }).join("");

  const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير شهر ${label}</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:800px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#00355f,#0f4c81);color:#fff;padding:24px;text-align:center">
    <h1 style="margin:0;font-size:24px">📊 تقرير الحضور الشهري</h1>
    <p style="margin:8px 0 0;opacity:.9">شركة اليامي للسفر والسياحة</p>
    <p style="margin:4px 0 0;font-size:18px;font-weight:bold">${label}</p>
  </div>
  <div style="padding:24px">
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
      <div style="background:#f9f9fc;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#888">السجلات</div><div style="font-size:24px;font-weight:bold;color:#00355f">${logs?.length||0}</div></div>
      <div style="background:#f9f9fc;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#888">الساعات</div><div style="font-size:24px;font-weight:bold;color:#003a3d">${totalH}س ${String(totalM).padStart(2,"0")}د</div></div>
      <div style="background:#f9f9fc;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#888">الموظفون</div><div style="font-size:24px;font-weight:bold;color:#a53b22">${rows.length}</div></div>
      <div style="background:#f9f9fc;padding:16px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#888">انصراف تلقائي</div><div style="font-size:24px;font-weight:bold;color:#c62828">${totalAuto} (${autoPct}%)</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead style="background:#00355f;color:#fff">
        <tr>
          <th style="padding:12px 8px;text-align:start">#</th>
          <th style="padding:12px 8px;text-align:start">الموظف</th>
          <th style="padding:12px 8px;text-align:start">الفرع</th>
          <th style="padding:12px 8px;text-align:center">أيام</th>
          <th style="padding:12px 8px;text-align:center">الساعات</th>
          <th style="padding:12px 8px;text-align:center">متوسط/يوم</th>
          <th style="padding:12px 8px;text-align:center">انصراف تلقائي</th>
        </tr>
      </thead>
      <tbody>${rowsHtml || `<tr><td colspan="7" style="padding:24px;text-align:center;color:#888">لا توجد بيانات</td></tr>`}</tbody>
    </table>
  </div>
  <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#888">
    📱 https://al76yame-dot.github.io/alyame-attendance/<br>
    © ${new Date().getFullYear()} شركة اليامي للسفر والسياحة
  </div>
</div></body></html>`;
  return { html, label, totalRecords: logs?.length||0, totalEmployees: rows.length };
}

async function sendEmail(to: string, subject: string, html: string){
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY not configured");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html })
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`Email failed: ${e}`);
  }
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    let body: any = {};
    try { body = await req.json(); } catch(_) {}

    // If called by cron with no body, send to saved email for previous month
    let { email, month } = body;
    if (!email) {
      const { data } = await supa.from("att_settings").select("value").eq("key","report_email").single();
      email = data?.value || "";
    }
    if (!month) {
      // Previous month
      const d = new Date();
      d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()-1);
      month = d.toISOString().slice(0,7);
    }
    if (!email) return new Response(JSON.stringify({ error:"no email configured" }), { status:400, headers: cors });

    const report = await buildReport(month);
    const result = await sendEmail(email, `📊 تقرير حضور ${report.label} — اليامي للسفر`, report.html);

    return new Response(JSON.stringify({ ok:true, email, month, ...report, email_id: result.id }), {
      headers: { ...cors, "Content-Type":"application/json" }
    });
  } catch(e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status:500, headers: cors });
  }
});
