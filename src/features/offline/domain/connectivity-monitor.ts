type MonitorOptions = {
  initialOnline: boolean;
  probe: (signal: AbortSignal) => Promise<boolean>;
  onChange: (online: boolean) => void;
};

// Native network events can be missed or stale, particularly after backgrounding.
// Verify internet access independently, including when the native state says offline.
export function createConnectivityMonitor({ initialOnline, probe, onChange }: MonitorOptions) {
  let online = initialOnline;
  let active = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: { controller: AbortController; result: Promise<boolean> } | undefined;

  const publish = (next: boolean) => { online = next; onChange(next); };
  const cancel = () => {
    clearTimeout(timer);
    request?.controller.abort();
    request = undefined;
  };

  function check(): Promise<boolean> {
    if (disposed || !active) return Promise.resolve(false);
    if (request) return request.result;
    clearTimeout(timer);
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const cancelled = new Promise<boolean>((resolve) => {
      controller.signal.addEventListener('abort', () => resolve(false), { once: true });
      timeout = setTimeout(() => controller.abort(), 5_000);
    });
    const current = { controller, result: Promise.resolve(false) };
    request = current;
    current.result = Promise.race([
      Promise.resolve().then(() => probe(controller.signal)).catch(() => false),
      cancelled,
    ]).then((reachable) => {
      // An old check must never override a later disconnect or app suspension.
      if (request !== current || disposed || !active) return false;
      publish(reachable);
      return reachable;
    }).finally(() => {
      clearTimeout(timeout);
      if (request === current) {
        request = undefined;
        timer = setTimeout(() => { void check(); }, online ? 30_000 : 3_000);
      }
    });
    return current.result;
  }

  return {
    check,
    networkChanged(connected: boolean | null) {
      if (disposed || !active) return;
      cancel();
      if (connected === false) publish(false);
      void check();
    },
    setActive(next: boolean) {
      if (disposed || active === next) return;
      active = next;
      cancel();
      if (active) void check();
    },
    dispose() { disposed = true; cancel(); },
  };
}
