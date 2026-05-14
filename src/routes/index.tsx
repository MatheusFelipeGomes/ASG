import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { usePixCharge } from "@/hooks/usePixCharge";
import { ConnectionBadge } from "@/components/kiosk/ConnectionBadge";
import { PaymentScreen } from "@/components/kiosk/PaymentScreen";
import { ApprovedScreen } from "@/components/kiosk/ApprovedScreen";
import { ExpiredScreen } from "@/components/kiosk/ExpiredScreen";
import { OfflineScreen } from "@/components/kiosk/OfflineScreen";
import { DEFAULT_FARE_CENTS, RESET_AFTER_APPROVAL_MS, getDeviceUid } from "@/lib/kiosk-config";

export const Route = createFileRoute("/")({
  component: KioskTerminal,
  head: () => ({
    meta: [
      { title: "Terminal Pix • Ônibus" },
      { name: "description", content: "Pagamento Pix para acesso ao transporte público." },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" },
    ],
  }),
});

function KioskTerminal() {
  const connection = useConnectionStatus();
  const { charge, creating, createCharge, reset } = usePixCharge(DEFAULT_FARE_CENTS);

  // Auto-create initial charge once we are online.
  useEffect(() => {
    if (connection === "online" && !charge && !creating) {
      createCharge();
    }
  }, [connection, charge, creating, createCharge]);

  // After approval, reset to a fresh charge.
  useEffect(() => {
    if (charge?.status !== "paid") return;
    const t = setTimeout(() => {
      reset();
    }, RESET_AFTER_APPROVAL_MS);
    return () => clearTimeout(t);
  }, [charge?.status, reset]);

  const offline = connection !== "online";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background bg-grid">
      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-black text-primary-foreground">
            P
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">Terminal Pix</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {getDeviceUid()}
            </p>
          </div>
        </div>
        <ConnectionBadge state={connection} />
      </header>

      {/* Body */}
      <div className="h-full pt-24">
        {offline ? (
          <OfflineScreen state={connection} />
        ) : charge?.status === "paid" ? (
          <ApprovedScreen />
        ) : charge?.status === "expired" ? (
          <ExpiredScreen onRetry={createCharge} />
        ) : (
          <PaymentScreen charge={charge} amountCents={DEFAULT_FARE_CENTS} loading={creating} />
        )}
      </div>

      {/* Payment confirmation is now server-only (PSP webhook → service role). */}
    </main>
  );
}
