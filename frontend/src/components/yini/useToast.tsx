'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/** A single short message that fades itself out. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const node = (
    <div className="ytoast" role="status" aria-live="polite" hidden={!msg}>{msg}</div>
  );
  return { toast: show, toastNode: node };
}
