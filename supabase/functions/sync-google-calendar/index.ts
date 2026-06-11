// Sync guide's schedule + Multipass reminders to Google Calendar (gateway)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const TZ = "America/New_York";

interface Contract {
  id: string;
  nome_completo: string;
  telefone: string;
  datas_requeridas: string;
  nome_guia: string;
  hospede_disney?: boolean;
}

function parseDates(raw: string): { day: number; month: number; year: number; park: string }[] {
  const out: { day: number; month: number; year: number; park: string }[] = [];
  const currentYear = new Date().getFullYear();
  raw.split(/[,;\n]/).forEach((line) => {
    const t = line.trim();
    if (!t) return;
    const m = t.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (!m) return;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10)) : currentYear;
    const park = t.replace(m[0], "").replace(/[-–—():]/g, "").trim() || "Parque";
    out.push({ day, month, year, park });
  });
  return out;
}

async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function upsertEvent(LOVABLE: string, CONN: string, eventId: string, body: Record<string, unknown>) {
  const headers = {
    Authorization: `Bearer ${LOVABLE}`,
    "X-Connection-Api-Key": CONN,
    "Content-Type": "application/json",
  };
  // Try update first
  const upd = await fetch(`${GATEWAY}/calendars/primary/events/${eventId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ ...body, id: eventId }),
  });
  if (upd.ok) return { action: "updated", status: upd.status };
  if (upd.status === 404) {
    const ins = await fetch(`${GATEWAY}/calendars/primary/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, id: eventId }),
    });
    if (!ins.ok) {
      const txt = await ins.text();
      return { action: "error", status: ins.status, error: txt };
    }
    return { action: "created", status: ins.status };
  }
  const txt = await upd.text();
  return { action: "error", status: upd.status, error: txt };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    const CONN = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
    if (!LOVABLE || !CONN) throw new Error("Missing API credentials");

    const body = await req.json().catch(() => ({}));
    const guideName: string = body?.guideName ?? "";
    const contractId: string | undefined = body?.contractId;

    if (!guideName && !contractId) {
      return new Response(JSON.stringify({ error: "guideName or contractId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const filter = contractId
      ? `id=eq.${contractId}`
      : `nome_guia=ilike.${encodeURIComponent(guideName)}`;
    const qres = await fetch(
      `${SUPABASE_URL}/rest/v1/contracts?${filter}&select=id,nome_completo,telefone,datas_requeridas,nome_guia,hospede_disney`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const contracts = (await qres.json()) as Contract[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let created = 0, updated = 0, errors = 0;
    const errorDetails: unknown[] = [];

    for (const c of contracts) {
      const parsed = parseDates(c.datas_requeridas);
      if (parsed.length === 0) continue;

      // All-day park events (only future ones)
      for (const p of parsed) {
        const d = new Date(p.year, p.month - 1, p.day);
        if (d < today) continue;
        const dateStr = `${p.year}-${pad(p.month)}-${pad(p.day)}`;
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const endStr = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
        const eid = await sha1Hex(`park-${c.id}-${dateStr}-${p.park}`);
        const r = await upsertEvent(LOVABLE, CONN, eid, {
          summary: `🎢 ${p.park} — ${c.nome_completo}`,
          description: `Cliente: ${c.nome_completo}\nTel: ${c.telefone}\nHóspede Disney: ${c.hospede_disney ? "Sim" : "Não"}\nContrato: ${c.id}`,
          start: { date: dateStr },
          end: { date: endStr },
        });
        if (r.action === "created") created++;
        else if (r.action === "updated") updated++;
        else { errors++; errorDetails.push(r); }
      }

      // Multipass reminder at earliest date - (7 or 3) days, 07:00 ET
      const sorted = parsed
        .map((p) => new Date(p.year, p.month - 1, p.day))
        .filter((d) => d >= today)
        .sort((a, b) => a.getTime() - b.getTime());
      const earliest = sorted[0];
      if (earliest) {
        const offset = c.hospede_disney ? 7 : 3;
        const buy = new Date(earliest); buy.setDate(buy.getDate() - offset);
        if (buy >= today) {
          const bStr = `${buy.getFullYear()}-${pad(buy.getMonth() + 1)}-${pad(buy.getDate())}`;
          const eid = await sha1Hex(`multipass-${c.id}-${bStr}`);
          const r = await upsertEvent(LOVABLE, CONN, eid, {
            summary: `⚡ Comprar Multipass — ${c.nome_completo}`,
            description: `Compra do Multipass (${c.hospede_disney ? "D-7 Hóspede Disney" : "D-3 Não Hóspede"})\nCliente: ${c.nome_completo}\nTel: ${c.telefone}\nViagem inicia: ${earliest.toLocaleDateString("pt-BR")}\nContrato: ${c.id}`,
            start: { dateTime: `${bStr}T07:00:00`, timeZone: TZ },
            end: { dateTime: `${bStr}T07:30:00`, timeZone: TZ },
            reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 15 }, { method: "popup", minutes: 0 }] },
          });
          if (r.action === "created") created++;
          else if (r.action === "updated") updated++;
          else { errors++; errorDetails.push(r); }
        }
      }
    }

    return new Response(JSON.stringify({ created, updated, errors, errorDetails: errorDetails.slice(0, 3), contractsProcessed: contracts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-google-calendar error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
