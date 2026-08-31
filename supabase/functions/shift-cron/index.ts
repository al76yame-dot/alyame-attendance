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
    timeZone: tz, hour: "2-digit", minute: "2-digit", year:"numeric", month:"2-digit", day:"2-digit", weekday:"short", hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map(p => [p.type, p.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const minutes = parseInt(parts.hour)*60 + parseInt(parts.minute);
  const weekday = (parts.weekday||"").toLowerCase(); // "fri", "sat", ...
  return { date, minutes, weekday };
}

async function setSetting(key: string, value: string){
  await supa.from("att_settings").upsert({ key, value }, { onConflict: "key" });
}

async function getSettings(){
  const m: Record<string,string> = {};
  // Config keys (branch_*, geofence_*, etc.) — never truncated by row limits
  const { data: cfg, error } = await supa.from("att_settings")
    .select("key,value").not("key", "like", "alert_%").limit(500);
  if (error) throw new Error("settings read failed: " + error.message);
  (cfg||[]).forEach((r: any) => m[r.key] = r.value);
  // Today's alert flags only
  const today = new Date().toISOString().slice(0,10);
  const { data: flags } = await supa.from("att_settings")
    .select("key,value").like("key", `%_${today}`).limit(200);
  (flags||[]).forEach((r: any) => m[r.key] = r.value);
  return m;
}

// Housekeeping: delete alert flags older than 7 days so the table stays small
function minutesOfHour(){ return new Date().getUTCMinutes(); }

async function purgeOldAlertFlags(){
  const cutoff = new Date(Date.now() - 7*24*60*60*1000).toISOString().slice(0,10);
  const { data } = await supa.from("att_settings").select("key").like("key","alert_%").limit(2000);
  const stale = (data||[])
    .map((r: any) => r.key as string)
    .filter(k => { const m = k.match(/(\d{4}-\d{2}-\d{2})$/); return m && m[1] < cutoff; });
  for (const k of stale) await supa.from("att_settings").delete().eq("key", k);
  return stale.length;
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
  // Include ALL active employees in branch (admins, managers, finance, etc.)
  const { data } = await supa.from("att_employees").select("id, branch, active").eq("active", true);
  return (data||[]).filter((e: any) => matchBranchText(branch, e.branch||"")).map((e: any) => e.id);
}

async function getOpenLogs(employeeIds: string[]){
  if (!employeeIds.length) return [];
  const { data } = await supa.from("att_logs").select("id,employee_id,check_in")
    .in("employee_id", employeeIds).is("check_out", null);
  return data || [];
}

async function processBranch(branchKey: string, s: Record<string,string>){
  const tz = branchKey === "tripoli" ? "Africa/Tripoli" : "Africa/Cairo";
  const { date, minutes, weekday } = nowInTZ(tz);
  // Friday is the official weekly holiday (Libyan system) — no alerts, no auto-checkout
  if (weekday === "fri") return { skipped:true, reason:"Friday holiday" };
  const start = s[`branch_${branchKey}_start`];
  const end   = s[`branch_${branchKey}_end`];
  if (!start || !end) return { skipped:true, reason:"missing times", start, end, keys: Object.keys(s).length };
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

  // Repeating late check-in reminders: every 15 min for 1 hour after shift start
  // Fires at +15, +30, +45, +60 — only to employees who STILL haven't checked in today.
  // Stops automatically once the employee registers (they won't be in the "missing" list).
  for (const offset of [15, 30, 45, 60]) {
    const lateInKey = `alert_${branchKey}_latein${offset}_${date}`;
    if (Math.abs(minutes - (startM + offset)) <= 2 && s[lateInKey] !== "1") {
      // Find employees who have NO log today (not checked in)
      const startToday = new Date();
      startToday.setUTCHours(0, 0, 0, 0);
      const { data: todayLogs } = await supa.from("att_logs")
        .select("employee_id").gte("check_in", startToday.toISOString()).in("employee_id", empIds);
      const checkedInToday = new Set((todayLogs || []).map((l: any) => l.employee_id));
      const missing = empIds.filter(id => !checkedInToday.has(id));
      if (missing.length) {
        const remaining = 60 - offset; // minutes left in the reminder window
        const tail = offset >= 60
          ? "هذا آخر تذكير. سجّل حضورك الآن."
          : `سيتكرر التذكير كل 15 دقيقة (${remaining} دقيقة متبقية).`;
        const sent = await sendPushToEmployees(
          missing,
          "⚠️ لم تسجّل حضورك بعد",
          `مرّت ${offset} دقيقة على بداية الدوام (${start}). ${tail}`,
          `late-in-${offset}-${branchKey}-${date}`
        );
        results.sent[`lateIn${offset}`] = sent;
      }
      await setSetting(lateInKey, "1");
    }
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

  // Auto check-out: runs on EVERY tick (not a narrow window) so nothing stays open forever.
  // Closes any open log whose own shift-end + 30min has already passed.
  const autoKey = `alert_${branchKey}_auto_${date}`;
  if (minutes >= endM + 30) {
    const open = await getOpenLogs(empIds);
    let auto = 0;
    const out = new Date();
    for (const l of open) {
      const inT = new Date(l.check_in);
      // Close at that log's OWN shift end +30 (handles stale logs from previous days)
      const inLocal = new Date(inT.toLocaleString("en-US", { timeZone: tz }));
      const closeAt = new Date(inT);
      closeAt.setUTCMinutes(closeAt.getUTCMinutes() + ((endM + 30) - (inLocal.getHours()*60 + inLocal.getMinutes())));
      const closeTime = closeAt > out ? out : closeAt;
      const dur = Math.floor((closeTime.getTime() - inT.getTime())/60000);
      await supa.from("att_logs").update({
        check_out: closeTime.toISOString(),
        duration_min: dur > 0 ? dur : 0,
        status: "completed",
        note: "تم تسجيل الانصراف تلقائياً بعد 30 دقيقة من نهاية الدوام"
      }).eq("id", l.id);
      auto++;
    }
    if (auto > 0){
      const targets = open.map((l: any) => l.employee_id);
      await sendPushToEmployees(targets, "✅ انصراف تلقائي", `تم تسجيل انصرافك تلقائياً بعد 30 دقيقة من نهاية الدوام (${end}).`, `auto-out-${branchKey}-${date}`);

      // Forgetfulness streak: notify admins if employee has 3+ auto-outs in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      const { data: admins } = await supa.from("att_employees").select("id").eq("is_admin", true).eq("active", true);
      const adminIds = (admins||[]).map((a: any) => a.id);
      for (const empId of targets) {
        const { data: recent } = await supa.from("att_logs").select("id, note")
          .eq("employee_id", empId).gte("check_in", sevenDaysAgo);
        const autoCount = (recent||[]).filter((r: any) => (r.note||"").includes("تلقائياً")).length;
        if (autoCount >= 3 && adminIds.length) {
          const { data: empData } = await supa.from("att_employees").select("name").eq("id", empId).single();
          await sendPushToEmployees(adminIds,
            "⚠️ تكرار نسيان الانصراف",
            `${empData?.name||"موظف"} نسي تسجيل الانصراف ${autoCount} مرات خلال آخر 7 أيام.`,
            `forget-${empId}-${date}`
          );
        }
      }
    }
    if (auto > 0) await setSetting(autoKey, "1");
    results.sent.auto = auto;
  }

  return results;
}

// Daily digest (once at ~09:00 Tripoli time): notify admins of employees
// who still haven't enabled notifications.
async function dailyNotifDigest(s: Record<string,string>){
  const { date, minutes, weekday } = nowInTZ("Africa/Tripoli");
  if (weekday === "fri") return { skipped: "friday" };
  // Fire only in the 09:00–09:02 window, once per day
  if (Math.abs(minutes - 9*60) > 2) return { skipped: "not 09:00" };
  const flag = `digest_notif_${date}`;
  if (s[flag] === "1") return { skipped: "already sent" };

  // Active non-admin employees
  const { data: emps } = await supa.from("att_employees")
    .select("id,name,branch").eq("active", true).eq("is_admin", false);
  // Who has push subscriptions
  const { data: subs } = await supa.from("att_push_subs").select("employee_id");
  const hasSub = new Set((subs||[]).map((x: any) => x.employee_id));
  const missing = (emps||[]).filter((e: any) => !hasSub.has(e.id));

  // Admins to notify
  const { data: admins } = await supa.from("att_employees")
    .select("id").eq("is_admin", true).eq("active", true);
  const adminIds = (admins||[]).map((a: any) => a.id);

  let sent = 0;
  if (missing.length && adminIds.length) {
    const names = missing.map((e: any) => `• ${e.name} (${e.branch||"-"})`).join("\n");
    sent = await sendPushToEmployees(
      adminIds,
      `🔕 ${missing.length} موظف بدون إشعارات`,
      `لم يفعّلوا الإشعارات بعد:\n${names}`,
      `digest-${date}`
    );
  }
  await setSetting(flag, "1");
  return { missing: missing.length, sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const s = await getSettings();
    const r1 = await processBranch("tripoli", s);
    const r2 = await processBranch("cairo", s);
    const digest = await dailyNotifDigest(s);
    const purged = (minutesOfHour() === 5) ? await purgeOldAlertFlags() : 0;
    return new Response(JSON.stringify({ tripoli: r1, cairo: r2, digest, ts: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type":"application/json" }
    });
  } catch(e: any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
