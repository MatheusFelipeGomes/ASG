import { useEffect, useState } from "react";
import { QrPanel } from "./QrPanel";
import { formatBRL } from "@/lib/kiosk-config";
import type { PixCharge } from "@/hooks/usePixCharge";

function useCountdown(expiresAt: string | undefined) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secondsLeft;
}

export function PaymentScreen({
  charge,
  amountCents,
  loading,
}: {
  charge: PixCharge | null;
  amountCents: number;
  loading: boolean;
}) {
  const seconds = useCountdown(charge?.expires_at);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="grid h-full grid-cols-2 gap-12 px-16 py-12">
      {/* Left: fare info */}
      <div className="flex flex-col justify-center gap-10 animate-slide-up">
        <div>
          <p className="text-xl font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Tarifa
          </p>
          <p className="mt-3 text-[10rem] font-black leading-none tracking-tight text-primary text-shadow-glow tabular-nums">
            {formatBRL(amountCents)}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              1
            </span>
            <p className="text-xl font-medium">Abra o app do seu banco</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              2
            </span>
            <p className="text-xl font-medium">Escaneie o QR Code Pix</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              3
            </span>
            <p className="text-xl font-medium">Aguarde a liberação</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
          </span>
          <p className="text-lg font-medium text-muted-foreground">
            Aguardando pagamento • expira em{" "}
            <span className="font-bold tabular-nums text-foreground">
              {mm}:{ss}
            </span>
          </p>
        </div>
      </div>

      {/* Right: QR */}
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="w-full max-w-md">
          <QrPanel value={charge?.qr_code ?? null} loading={loading} />
        </div>
        <p className="text-center text-base text-muted-foreground">
          Pix • Pagamento instantâneo
        </p>
      </div>
    </div>
  );
}
