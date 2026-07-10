"use client";

import { StoreProvider } from "@/lib/store/store";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <StoreProvider>{children}</StoreProvider>
    </ToastProvider>
  );
}
