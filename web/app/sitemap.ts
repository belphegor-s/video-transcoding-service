import type { MetadataRoute } from "next";

const SITE = "https://transcode.procd.cc";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/docs", priority: 0.8, changeFrequency: "monthly" },
    { path: "/signup", priority: 0.6, changeFrequency: "yearly" },
    { path: "/login", priority: 0.4, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  ];
  return pages.map((p) => ({ url: `${SITE}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority }));
}
