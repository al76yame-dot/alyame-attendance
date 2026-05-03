// Alyame Attendance — Scheduled shift reminders
// Runs every minute via pg_cron. Sends push at shift start, shift end,
// and at shift end +30min (with auto-checkout).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@alyame.ly";
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*"
};

function nowInTZ(tz: string){
  // Get current local time in given timezone
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", year:"numeric", month:"2-digit", day:"2-digit", hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = parseInt(parts.hour)*60 + parseInt(parts.minute);
  return { date, minutes };
}

async function setSetting(key: string, value: string){
  await supa.from("att_settings").upsert({ key, value }, { onConflict: "key" });
}

async function getSettings(){
  const { data } = await supa.from("att_settings").select("key,value");
  const m: Record<string,string> = {};
  (data||[]).forEach((r: any) => m[r.key] = r.value);
  return m;
}

async function sendPushToEmployees(employeeIds: string[]|null, title: string, body: string, tag: string){
  let q = supa.from("att_push_subs").select("id,endpoint,p256dh,auth,employee_id");
  if (employeeIds) q = q.in("employee_id", employeeIds);
  const { data: subs } = await q;
  if (!subs || !subs.length) return 0;
  const payload = JSON.stringify({ title, body, tag });
  let sent = 0;
  await Promise.allSettled(subs.map(async (s: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch(e: any){
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supa.from("att_push_subs").delete().eq("id", s.id);
      }
    }
  }));
  return sent;
}

function matchBranchText(branch: string, t: string){
  const x = (t||"").toLowerCase();
  if (branch === "tripoli") return x.includes("طرابلس") || x.includes("tripoli") || x.includes("ليبيا") || x.includes("libya") || x.includes("الرئيسي");
  if (branch === "cairo") return x.includes("قاهرة") || x.includes("cairo") || x.includes("مصر") || x.includes("egypt");
  return false;
}

async function getBranchEmployeeIds(branch: string): Promise<string[]>{
  const { data } = await supa.from("att_employees").select("id, branch, is_admin, active").eq("active", true);
  return (data||[]).filter((e: any) => !e.is_admin && matchBranchText(branch, e.branch||"")).map((e: any) => e.id);
}

async function getOpenLogs(employeeIds: string[]){
  if (!employeeIds.length) return [];
  const { data } = await supa.from("att_logs").select("id,employee_id,check_in")
    .in("employee_id", employeeIds).is("check_out", null);
  return data || [];
}

async function processBranch(branchKey: string, s: Record<string,string>){
  const tz = branchKey === "tripoli" ? "Africa/Tripoli" : "Africa/Cairo";
  const { date, minutes } = nowInTZ(tz);
  const start = s[`branch_${branchKey}_start`];
  const end   = s[`branch_${branchKey}_end`];
  if (!start || !end) return { skipped:true };
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startM = sh*60 + (sm||0);
  const endM   = eh*60 + (em||0);
  const empIds = await getBranchEmployeeIds(branchKey);
  if (!empIds.length) return { skipped:true, reason:"no employees" };

  const results: any = { branch: branchKey, sent:{} };

  // Pre-check-in reminder: 15 min before shift start
  const preInKey = `alert_${branchKey}_prein_${date}`;
  if (Math.abs(minutes - (startM-15)) <= 2 && s[preInKey] !== "1") {
    const sent = await sendPushToEmployees(empIds, "⏰ تذكير قبل الحضور", `يبدأ دوامك بعد 15 دقيقة (${start}). استعد لتسجيل الحضور.`, `pre-in-${branchKey}-${date}`);
    await setSetting(preInKey, "1");
    results.sent.preIn = sent;
  }

  // Check-in reminder: at shift start (±2 min)
  const inKey = `alert_${branchKey}_in_${date}`;
  if (Math.abs(minutes - startM) <= 2 && s[inKey] !== "1") {
    const sent = await sendPushToEmployees(empIds, "🔔 وقت الحضور الآن", `بدأ دوامك (${start}). سجّل حضورك الآن!`, `shift-in-${branchKey}-${date}`);
    await setSetting(inKey, "1");
    results.sent.in = sent;
  }

  // Late check-in nudge: 15 min after shift start (for those who haven't clocked in)
  const lateInKey = `alert_${branchKey}_latein_${date}`;
  if (Math.abs(minutes - (startM+15)) <= 2 && s[lateInKey] !== "1") {
    // Find employees who DON'T have an open log today
    const open = await getOpenLogs(empIds);
    const openSet = new Set(open.map((l: any) => l.employee_id));
    // Check if any have any log today
    const startToday = new Date();
    startToday.setUTCHours(0,0,0,0);
    const { data: todayLogs } = await supa.from("att_logs").select("employee_id").gte("check_in", startToday.toISOString()).in("employee_id", empIds);
    const checkedInToday = new Set((todayLogs||[]).map((l: any) => l.employee_id));
    const missing = empIds.filter(id => !checkedInToday.has(id));
    if (missing.length) {
      const sent = await sendPushToEmployees(missing, "⚠️ لم تسجّل حضورك بعد", `مرّت 15 دقيقة على بداية الدوام. سجّل حضورك الآن.`, `late-in-${branchKey}-${date}`);
      results.sent.lateIn = sent;
    }
    await setSetting(lateInKey, "1");
  }

  // Pre-check-out reminder: 15 min before shift end
  const preOutKey = `alert_${branchKey}_preout_${date}`;
  if (Math.abs(minutes - (endM-15)) <= 2 && s[preOutKey] !== "1") {
    const open = await getOpenLogs(empIds);
    const targets = open.map((l: any) => l.employee_id);
    if (targets.length) {
      const sent = await sendPushToEmployees(targets, "⏰ تذكير قبل الانصراف", `ينتهي دوامك بعد 15 دقيقة (${end}).`, `pre-out-${branchKey}-${date}`);
      results.sent.preOut = sent;
    }
    await setSetting(preOutKey, "1");
  }

  // Check-out reminder: at shift end
  const outKey = `alert_${branchKey}_out_${date}`;
  if (Math.abs(minutes - endM) <= 2 && s[outKey] !== "1") {
    const open = await getOpenLogs(empIds);
    const targets = open.map((l: any) => l.employee_id);
    if (targets.length) {
      const sent = await sendPushToEmployees(targets, "🔔 وقت الانصراف الآن", `انتهى دوامك (${end}). لا تنسَ تسجيل انصرافك!`, `shift-out-${branchKey}-${date}`);
      results.sent.out = sent;
    }
    await setSetting(outKey, "1");
  }

  // Auto check-out at shift end +30 (±2 min window) — combined notification + auto-out
  const autoKey = `alert_${branchKey}_auto_${date}`;
  if (Math.abs(minutes - (endM+30)) <= 2 && s[autoKey] !== "1") {
    const open = await getOpenLogs(empIds);
    let auto = 0;
    const out = new Date(); // current UTC time
    for (const l of open) {
      const inT = new Date(l.check_in);
      const dur = Math.floor((out.getTime() - inT.getTime())/60000);
      await supa.from("att_logs").update({
        check_out: out.toISOString(),
        duration_min: dur > 0 ? dur : 0,
        status: "completed",
        note: "تم تسجيل الانصراف تلقائياً بعد 30 دقيقة من نهاية الدوام"
      }).eq("id", l.id);
      auto++;
    }
    if (auto > 0){
      const targets = open.map((l: any) => l.employee_id);
      await sendPushToEmployees(targets, "✅ انصراف تلقائي", `تم تسجيل انصرافك تلقائياً بعد 30 دقيقة من نهاية الدوام (${end}).`, `auto-out-${branchKey}-${date}`);
    }
    await setSetting(autoKey, "1");
    results.sent.auto = auto;
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const s = await getSettings();
    const r1 = await processBranch("tripoli", s);
    const r2 = await processBranch("cairo", s);
    return new Response(JSON.stringify({ tripoli: r1, cairo: r2, ts: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type":"application/json" }
    });
  } catch(e: any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
