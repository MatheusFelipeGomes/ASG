import { WifiOff, Loader2 } from "lucide-react";
import type { ConnectionState } from "@/hooks/useConnectionStatus";

export function OfflineScreen({ state }: { state: ConnectionState }) {
  const reconnecting = state === "reconnecting";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 text-center">
      <div className="flex h-40 w-40 items-center justify-center rounded-full bg-destructive/15">
        {reconnecting ? (
          <Loader2 className="h-20 w-20 animate-spin text-warning" />
        ) : (
          <WifiOff className="h-20 w-20 text-destructive" />
        )}
      </div>
      <div className="space-y-3">
        <h1 className="text-6xl font-black tracking-tight">
          {reconnecting ? "Reconectando…" : "Sem conexão"}
        </h1>
        <p className="text-xl text-muted-foreground">
          {reconnecting
            ? "Aguarde enquanto restabelecemos o serviço."
            : "Aguarde alguns instantes ou use outra forma de pagamento."}
        </p>
      </div>
    </div>
  );
}
