import { useEffect, useState } from "react";

import { useSessionStore } from "@/stores/session-store";

export function useSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSessionStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
