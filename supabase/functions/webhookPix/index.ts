// Edge Function: webhookPix
// Receives Pix payment confirmations from Efí and marks the payment as `paid`.
// Realtime updates on the `payments` table are then broadcast to subscribed
// kiosks automatically (handled by the Supabase Realtime publication).
//
// POST /functions/v1/webhookPix
//
// Security:
//   - Efí calls this endpoint via mTLS (server-side cert pinning is enforced
//     by the Efí dashboard config). For an additional defense-in-depth layer
//     we also require a shared secret in the URL or header:
//       header  x-webhook-secret: <EFI_WEBHOOK_SECRET>
//   - The function uses constant-time comparison and ignores invalid payloads.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface EfiWebhookPix {
  endToEndId: string;
  txid: string;
  valor: string;
  horario: string; // ISO
  infoPagador?: string;
  pagador?: { cpf?: string; cnpj?: string; nome?: string };
}

interface EfiWebhookPayload {
  pix?: EfiWebhookPix[];
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Efí pings the URL with an empty body to validate. Always 200.
  if (req.method === "GET" || req.method === "HEAD") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  const expectedSecret = Deno.env.get("EFI_WEBHOOK_SECRET");
  if (expectedSecret) {
    const provided = req.headers.get("x-webhook-secret") ??
      new URL(req.url).searchParams.get("secret") ?? "";
    if (!timingSafeEqual(provided, expectedSecret)) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: EfiWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    // Efí sometimes posts a validation ping with empty/invalid body
    return jsonResponse({ ok: true });
  }

  if (!payload.pix || payload.pix.length === 0) {
    return jsonResponse({ ok: true });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const results: Array<{ txid: string; status: string; error?: string }> = [];

  for (const pix of payload.pix) {
    if (!pix.txid || !pix.endToEndId) {
      results.push({ txid: pix.txid ?? "?", status: "skipped" });
      continue;
    }

    // Idempotency: only update pending payments
    const { data, error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: pix.horario ?? new Date().toISOString(),
        end_to_end_id: pix.endToEndId,
        payer_name: pix.pagador?.nome ?? null,
        payer_document: pix.pagador?.cpf ?? pix.pagador?.cnpj ?? null,
        metadata: { efi_pix: pix },
      })
      .eq("txid", pix.txid)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Update error", pix.txid, error);
      results.push({ txid: pix.txid, status: "error", error: error.message });
      continue;
    }
    results.push({
      txid: pix.txid,
      status: data ? "paid" : "ignored_not_pending",
    });
  }

  return jsonResponse({ ok: true, results });
});
