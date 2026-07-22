import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SwRegister } from "@/components/SwRegister";
import { InstallHint } from "@/components/InstallHint";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Social dos Palpiteiros (Beta)",
  description: "Social dos Palpiteiros — palpite, dispute e divirta-se com os amigos na Copa do Mundo 2026.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Social dos Palpiteiros",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Capture beforeinstallprompt before React hydrates — Android Chrome fires it early */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__pwa_prompt=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwa_prompt=e;});`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <TopBar />
          <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-4">{children}</main>
          <BottomNav />
          <InstallHint />
        </AuthProvider>
        <SwRegister />
      </body>
    </html>
  );
}
