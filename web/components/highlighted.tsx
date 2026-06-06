"use client";

import { Highlight, type PrismTheme } from "prism-react-renderer";
import { cn } from "@/lib/utils";

// Dark theme tuned to the app palette: lime tags/keywords, green names,
// warm sand strings, faint punctuation/comments.
const theme: PrismTheme = {
  plain: { color: "#ededec", backgroundColor: "transparent" },
  styles: [
    { types: ["comment", "prolog", "doctype", "cdata"], style: { color: "#6a6a70", fontStyle: "italic" } },
    { types: ["punctuation"], style: { color: "#6a6a70" } },
    { types: ["tag", "keyword", "selector", "operator", "property", "important", "atrule"], style: { color: "#cdfb46" } },
    { types: ["attr-name", "function", "class-name", "builtin"], style: { color: "#8fe388" } },
    { types: ["string", "attr-value", "char", "inserted", "number", "boolean", "url", "regex"], style: { color: "#dcc28a" } },
    { types: ["variable", "constant", "symbol"], style: { color: "#ededec" } },
    { types: ["deleted"], style: { color: "#ff6b5e" } },
  ],
};

const LANG_ALIASES: Record<string, string> = {
  html: "markup",
  xml: "markup",
  shell: "bash",
  sh: "bash",
  curl: "bash",
  response: "json",
};

export function Highlighted({ code, lang = "bash", wrap = false }: { code: string; lang?: string; wrap?: boolean }) {
  const language = LANG_ALIASES[lang] ?? lang;
  return (
    <Highlight code={code} language={language} theme={theme}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre
          className={cn("bg-transparent font-mono text-[12.5px] leading-relaxed", wrap ? "whitespace-pre-wrap break-words" : "overflow-x-auto")}
        >
          {tokens.map((line, i) => {
            const { key: _lk, ...lineProps } = getLineProps({ line });
            return (
              <div key={i} {...lineProps}>
                {line.map((token, k) => {
                  const { key: _tk, ...tokenProps } = getTokenProps({ token });
                  return <span key={k} {...tokenProps} />;
                })}
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}
