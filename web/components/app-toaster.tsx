"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/lib/theme";

export function AppToaster() {
  const { resolved } = useTheme();
  return (
    <Toaster
      theme={resolved}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--ink)",
          fontFamily: "var(--font-sans)",
        },
      }}
    />
  );
}
