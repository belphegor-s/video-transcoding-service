import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = "https://transcode.pixly.sh";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Transcoder: adaptive video pipeline with AI captions",
    template: "%s · Transcoder",
  },
  description:
    "Upload once. Get adaptive HLS streams from 144p to 4K, auto-generated captions, and global CDN delivery. A production-grade transcoding pipeline.",
  keywords: ["video transcoding", "HLS", "adaptive bitrate", "AI captions", "ffmpeg", "CDN"],
  authors: [{ name: "Ayush Sharma" }],
  openGraph: {
    title: "Transcoder: adaptive video pipeline with AI captions",
    description: "Adaptive HLS from 144p to 4K, AI captions, global CDN. Upload once.",
    url: siteUrl,
    siteName: "Transcoder",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="relative antialiased">{children}</body>
    </html>
  );
}
