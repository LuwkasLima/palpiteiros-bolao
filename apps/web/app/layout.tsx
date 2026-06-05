import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SwRegister } from "@/components/SwRegister";
import { InstallHint } from "@/components/InstallHint";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Bolão Copa 2026",
  description: "Bolão da Copa do Mundo 2026 — palpite, dispute e divirta-se com os amigos.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bolão 2026",
  },
  icons: {
    icon: "/icons/icon-192.png",
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
      <body>
        <AuthProvider>
          <TopBar />
          <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">{children}</main>
          <InstallHint />
        </AuthProvider>
        <SwRegister />
      </body>
    </html>
  );
}
