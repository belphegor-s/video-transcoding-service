"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-bg">
      {label && (
        <div className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-label text-faint">{label}</div>
      )}
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[10px] text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
      >
        {copied ? <Check className="h-3 w-3 text-ok" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}
