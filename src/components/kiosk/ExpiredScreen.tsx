import { RefreshCw, TimerOff } from "lucide-react";

export function ExpiredScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 text-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-warning/15">
        <TimerOff className="h-20 w-20 text-warning" />
      </div>
      <div className="space-y-3">
        <h1 className="text-6xl font-black tracking-tight text-warning">QR EXPIRADO</h1>
        <p className="text-xl text-muted-foreground">Toque para gerar um novo código.</p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-3 rounded-2xl bg-primary px-12 py-6 text-2xl font-bold text-primary-foreground shadow-[0_20px_60px_-15px_oklch(0.78_0.18_165/0.6)] transition-transform active:scale-95"
      >
        <RefreshCw className="h-7 w-7" />
        Gerar novo QR Code
      </button>
    </div>
  );
}
