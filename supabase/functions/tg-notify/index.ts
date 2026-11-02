// Telegram group notifier — keeps the bot token server-side.
// Secrets: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const CHAT = Deno.env.get("TELEGRAM_CHAT_ID") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

export async function tgSend(text: string){
  if (!TOKEN || !CHAT) return { ok:false, error:"telegram not configured" };
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, result: j };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { text } = await req.json();
    if (!text) return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: cors });
    const out = await tgSend(text);
    return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
});
