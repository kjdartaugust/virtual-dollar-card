"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<{
  toast: (message: string, kind?: ToastKind) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 shadow-[var(--shadow-lg)] animate-scale-in glass"
            )}
          >
            {t.kind === "success" && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            )}
            {t.kind === "error" && (
              <XCircle className="h-5 w-5 shrink-0 text-danger" />
            )}
            {t.kind === "info" && (
              <Info className="h-5 w-5 shrink-0 text-accent" />
            )}
            <span className="text-sm text-foreground">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
