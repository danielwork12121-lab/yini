'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** One short message that fades itself out, in the app's look. */
export function useAppToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useCallback((text: string) => {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { toast, node: <div className="toast" role="status" aria-live="polite" hidden={!msg}>{msg}</div> };
}
