"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const TOAST_DURATION_MS = 4000;

const ToastContext = createContext<(message: string) => void>(() => {});

/** Shows a short message after a save, e.g. "Password changed". */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const show = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-toast flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          <p
            key={toast.id}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground shadow-md"
          >
            <CheckCircleIcon aria-hidden weight="fill" className="size-5" />
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
