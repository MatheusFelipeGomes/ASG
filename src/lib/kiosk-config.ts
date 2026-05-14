import { supabase } from "@/integrations/supabase/client";

// Kiosk configuration — device id is persisted per terminal in localStorage.
const DEVICE_UID_KEY = "kiosk:device_uid";
const DEVICE_ID_KEY = "kiosk:device_id"; // resolved UUID from devices table

export function getDeviceUid(): string {
  if (typeof window === "undefined") return "ssr";
  let uid = localStorage.getItem(DEVICE_UID_KEY);
  if (!uid) {
    uid = `bus-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(DEVICE_UID_KEY, uid);
  }
  return uid;
}

/**
 * Resolve (or self-register) the device row and return its UUID.
 * Cached in localStorage after first resolution.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const cached = localStorage.getItem(DEVICE_ID_KEY);
  if (cached) return cached;

  const uid = getDeviceUid();
  const existing = await supabase
    .from("devices")
    .select("id")
    .eq("device_uid", uid)
    .maybeSingle();

  let id = existing.data?.id;
  if (!id) {
    const inserted = await supabase
      .from("devices")
      .insert({ device_uid: uid, name: `Terminal ${uid}`, status: "active" })
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    id = inserted.data.id;
  }
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}

// Default fare in cents (R$ 5,00). In production this would be fetched per route.
export const DEFAULT_FARE_CENTS = 500;

// QR expires in 5 minutes (Pix dinâmico padrão).
export const QR_EXPIRATION_SECONDS = 300;

// After approval, kiosk resets to idle.
export const RESET_AFTER_APPROVAL_MS = 5000;

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
