import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
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

const siteUrl = "https://transcode.procd.cc";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Transcoder: adaptive video pipeline with AI captions",
    template: "%s · Transcoder",
  },
  description: "Upload once. Get adaptive HLS streams from 144p to 4K, auto-generated captions, and global CDN delivery. A production-grade transcoding pipeline.",
  keywords: ["video transcoding", "HLS", "adaptive bitrate", "AI captions", "ffmpeg", "CDN"],
  authors: [{ name: "Ayush Sharma", url: "https://ayushsharma.me" }],
  creator: "Ayush Sharma",
  publisher: "Ayush Sharma",
  applicationName: "Transcoder",
  category: "technology",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: "Transcoder: adaptive video pipeline with AI captions",
    description: "Adaptive HLS from 144p to 4K, AI captions, global CDN. Upload once.",
    url: siteUrl,
    siteName: "Transcoder",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transcoder: adaptive video pipeline with AI captions",
    description: "Adaptive HLS from 144p to 4K, AI captions, global CDN. Upload once.",
    creator: "@sharma_0502",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="relative antialiased">
        {children}
        <Toaster
          theme="dark"
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
      </body>
    </html>
  );
}
