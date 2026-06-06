"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Highlighted } from "./highlighted";

export function CodeBlock({ code, label, lang = "bash" }: { code: string; label?: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-label text-faint">{label ?? lang}</span>
        <button
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted transition-colors hover:text-ink"
        >
          {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="px-4 py-3.5">
        <Highlighted code={code} lang={lang} />
      </div>
    </div>
  );
}
