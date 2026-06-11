import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SwRegister } from "@/components/SwRegister";
import { InstallHint } from "@/components/InstallHint";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Social dos Palpiteiros",
  description: "Social dos Palpiteiros — palpite, dispute e divirta-se com os amigos na Copa do Mundo 2026.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Social dos Palpiteiros",
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
