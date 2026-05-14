import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";

export function QrPanel({ value, loading }: { value: string | null; loading?: boolean }) {
  return (
    <div className="relative flex aspect-square w-full items-center justify-center rounded-3xl bg-white p-8 shadow-[0_30px_80px_-20px_oklch(0.78_0.18_165/0.4)]">
      {loading || !value ? (
        <Loader2 className="h-20 w-20 animate-spin text-foreground/30" />
      ) : (
        <QRCodeSVG
          value={value}
          level="M"
          marginSize={0}
          className="h-full w-full"
          bgColor="#ffffff"
          fgColor="#0a0f1c"
        />
      )}
    </div>
  );
}
