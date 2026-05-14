import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionState = "online" | "offline" | "reconnecting";

/**
 * Tracks browser connectivity + Supabase Realtime channel state.
 */
export function useConnectionStatus(): ConnectionState {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [realtimeState, setRealtimeState] = useState<ConnectionState>("reconnecting");

  useEffect(() => {
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("kiosk:heartbeat");
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") setRealtimeState("online");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setRealtimeState("reconnecting");
      else if (status === "CLOSED") setRealtimeState("offline");
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!browserOnline) return "offline";
  return realtimeState;
}
