import { Check } from "lucide-react";

export function ApprovedScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 text-center">
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-success/30 animate-pulse-ring" />
        <span className="absolute inset-0 rounded-full bg-success/20 animate-pulse-ring [animation-delay:.4s]" />
        <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-success animate-check-pop">
          <Check className="h-32 w-32 stroke-[3] text-success-foreground" />
        </div>
      </div>
      <div className="animate-slide-up [animation-delay:.3s] space-y-4">
        <h1 className="text-7xl font-black tracking-tight text-success text-shadow-glow">
          ACESSO LIBERADO
        </h1>
        <p className="text-2xl font-medium text-muted-foreground">Boa viagem!</p>
      </div>
    </div>
  );
}
