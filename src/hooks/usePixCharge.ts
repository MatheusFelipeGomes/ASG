import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_FARE_CENTS, QR_EXPIRATION_SECONDS, getOrCreateDeviceId } from "@/lib/kiosk-config";

export type ChargeStatus = "idle" | "pending" | "paid" | "expired";

export interface PixCharge {
  id: string;
  amount_cents: number;
  qr_code: string;
  status: ChargeStatus;
  expires_at: string;
}

/**
 * Manages the lifecycle of a Pix charge for a kiosk terminal.
 * - Creates a new charge on demand.
 * - Subscribes to realtime updates for status changes.
 * - Auto-expires after QR_EXPIRATION_SECONDS.
 */
export function usePixCharge(amountCents: number = DEFAULT_FARE_CENTS) {
  const [charge, setCharge] = useState<PixCharge | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expirationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createCharge = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const deviceId = await getOrCreateDeviceId();
      const expiresAt = new Date(Date.now() + QR_EXPIRATION_SECONDS * 1000);
      // Demo Pix payload — in production this comes from Efí/Gerencianet edge function.
      const txid = crypto.randomUUID().replace(/-/g, "").slice(0, 26);
      const fakeQr = `00020126580014BR.GOV.BCB.PIX0136${txid}5204000053039865802BR5913BUS TERMINAL6009SAO PAULO62070503***6304ABCD`;

      const { data, error: insertError } = await supabase
        .from("payments")
        .insert({
          device_id: deviceId,
          txid,
          amount_cents: amountCents,
          qr_code: fakeQr,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select("id, amount_cents, qr_code, status, expires_at")
        .single();

      if (insertError) throw insertError;
      setCharge({
        id: data.id,
        amount_cents: data.amount_cents,
        qr_code: data.qr_code,
        status: data.status as ChargeStatus,
        expires_at: data.expires_at,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar cobrança");
    } finally {
      setCreating(false);
    }
  }, [amountCents]);

  const reset = useCallback(() => {
    setCharge(null);
    setError(null);
    if (expirationTimer.current) clearTimeout(expirationTimer.current);
  }, []);

  // Auto-expiration timer
  useEffect(() => {
    if (!charge || charge.status !== "pending") return;
    const ms = new Date(charge.expires_at).getTime() - Date.now();
    if (ms <= 0) {
      setCharge((c) => (c ? { ...c, status: "expired" } : c));
      return;
    }
    expirationTimer.current = setTimeout(() => {
      setCharge((c) => (c && c.status === "pending" ? { ...c, status: "expired" } : c));
    }, ms);
    return () => {
      if (expirationTimer.current) clearTimeout(expirationTimer.current);
    };
  }, [charge]);

  // Realtime subscription scoped to this charge id
  useEffect(() => {
    if (!charge) return;
    const channel = supabase
      .channel(`pix:${charge.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
          filter: `id=eq.${charge.id}`,
        },
        (payload: { new: { status: ChargeStatus } }) => {
          const next = payload.new;
          setCharge((c) => (c ? { ...c, status: next.status } : c));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [charge?.id]);

  return { charge, creating, error, createCharge, reset };
}
