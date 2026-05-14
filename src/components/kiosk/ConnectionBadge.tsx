import { Wifi, WifiOff, Loader2 } from "lucide-react";
import type { ConnectionState } from "@/hooks/useConnectionStatus";

const styles: Record<ConnectionState, { label: string; cls: string; Icon: typeof Wifi }> = {
  online: { label: "Online", cls: "bg-success/15 text-success border-success/30", Icon: Wifi },
  reconnecting: {
    label: "Reconectando…",
    cls: "bg-warning/15 text-warning border-warning/30",
    Icon: Loader2,
  },
  offline: {
    label: "Sem conexão",
    cls: "bg-destructive/15 text-destructive border-destructive/30",
    Icon: WifiOff,
  },
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const { label, cls, Icon } = styles[state];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur ${cls}`}
    >
      <Icon className={`h-4 w-4 ${state === "reconnecting" ? "animate-spin" : ""}`} />
      {label}
    </div>
  );
}
