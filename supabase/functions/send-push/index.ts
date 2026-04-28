// Alyame Attendance — Send Push Notifications
// Edge function: receives {title, body, employee_ids?, tag?} and sends Web Push
// Required secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { title, body, employee_ids, tag } = await req.json();
    if (!title) return new Response(JSON.stringify({ error: "title required" }), { status: 400, headers: corsHeaders });

    let q = supa.from("att_push_subs").select("id, endpoint, p256dh, auth, employee_id");
    if (Array.isArray(employee_ids) && employee_ids.length) {
      q = q.in("employee_id", employee_ids);
    }
    const { data: subs, error } = await q;
    if (error) throw error;

    const payload = JSON.stringify({ title, body: body || "", tag: tag || "alyame" });
    const results = await Promise.allSettled((subs || []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        return { ok: true, id: s.id };
      } catch (e: any) {
        // Clean up dead subscriptions
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supa.from("att_push_subs").delete().eq("id", s.id);
        }
        return { ok: false, id: s.id, err: e?.message };
      }
    }));

    const sent = results.filter(r => r.status==="fulfilled" && (r as any).value.ok).length;
    return new Response(JSON.stringify({ total: subs?.length||0, sent }), { headers: { ...corsHeaders, "Content-Type":"application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
