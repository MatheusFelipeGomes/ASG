// Edge Function: createPix
// Creates a Pix cobrança at Efí, persists it in `payments`, and returns
// the QR code, copia-e-cola, txid and expiration timestamp.
//
// POST /functions/v1/createPix
// Body: { device_id: string (uuid), amount_cents: number,
//         expires_in?: number, payer?: { name, document }, description? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  createPixCobranca,
  generateTxid,
} from "../_shared/efi.ts";

interface CreatePixBody {
  device_id: string;
  amount_cents: number;
  expires_in?: number;
  payer?: { name: string; document: string };
  description?: string;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    s,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  let body: CreatePixBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validation
  if (!body.device_id || !isUuid(body.device_id)) {
    return jsonResponse({ error: "device_id must be a UUID" }, { status: 400 });
  }
  if (
    !Number.isInteger(body.amount_cents) ||
    body.amount_cents < 1 ||
    body.amount_cents > 100_000_00
  ) {
    return jsonResponse(
      { error: "amount_cents must be a positive integer (max R$100.000)" },
      { status: 400 },
    );
  }
  const expiresIn = body.expires_in ?? 300;
  if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 86400) {
    return jsonResponse(
      { error: "expires_in must be 60..86400 seconds" },
      { status: 400 },
    );
  }
  if (body.payer) {
    if (
      typeof body.payer.name !== "string" ||
      body.payer.name.length < 2 ||
      body.payer.name.length > 200 ||
      typeof body.payer.document !== "string" ||
      !/^\d{11}$/.test(body.payer.document)
    ) {
      return jsonResponse({ error: "Invalid payer" }, { status: 400 });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Verify device exists and is active
  const { data: device, error: devErr } = await supabase
    .from("devices")
    .select("id, status")
    .eq("id", body.device_id)
    .maybeSingle();
  if (devErr) {
    return jsonResponse({ error: devErr.message }, { status: 500 });
  }
  if (!device || device.status !== "active") {
    return jsonResponse({ error: "Device not found or inactive" }, {
      status: 404,
    });
  }

  // Create cobrança at Efí
  const txid = generateTxid();
  let efi;
  try {
    efi = await createPixCobranca({
      txid,
      amountCents: body.amount_cents,
      expiresInSeconds: expiresIn,
      payerName: body.payer?.name,
      payerDocument: body.payer?.document,
      description: body.description,
    });
  } catch (e) {
    console.error("Efí error:", e);
    return jsonResponse(
      { error: "Payment provider error", detail: String(e) },
      { status: 502 },
    );
  }

  // Persist
  const { data: payment, error: insErr } = await supabase
    .from("payments")
    .insert({
      device_id: body.device_id,
      txid: efi.txid,
      amount_cents: body.amount_cents,
      qr_code: efi.pixCopiaECola,
      qr_code_image: efi.qrCodeImage,
      status: "pending",
      expires_at: efi.expiresAt,
      payer_name: body.payer?.name ?? null,
      payer_document: body.payer?.document ?? null,
      metadata: { efi_loc_id: efi.locId },
    })
    .select("id, txid, expires_at")
    .single();

  if (insErr) {
    console.error("DB insert error:", insErr);
    return jsonResponse({ error: insErr.message }, { status: 500 });
  }

  return jsonResponse({
    id: payment.id,
    txid: payment.txid,
    qr_code: efi.pixCopiaECola,
    qr_code_image: efi.qrCodeImage,
    expiration_at: payment.expires_at,
  });
});
