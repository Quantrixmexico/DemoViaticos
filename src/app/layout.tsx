import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { InstallBanner } from "@/components/ui/InstallBanner"
import { PWARegister } from "@/components/ui/PWARegister"
import "./globals.css"
import { BRAND } from "@/lib/brand"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  title: BRAND.producto,
  description: BRAND.descripcion,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.nombreCorto,
  },
  icons: { icon: [{ url: "/icon-192.png?v=2", type: "image/png" }, { url: "/icon.svg?v=2", type: "image/svg+xml" }], apple: "/apple-touch-icon-180.png?v=2" },
}

export const viewport: Viewport = {
  themeColor: BRAND.colorOscuro,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={BRAND.nombreCorto} />
        <link rel="apple-touch-icon" href="/apple-touch-icon-180.png?v=2" />
        {/* Variables públicas en tiempo de ejecución (ver src/lib/public-env.ts) */}
        <Script src="/env.js" strategy="beforeInteractive" />
      </head>
      <body>
        <ThemeProvider>
          <PWARegister />
          <InstallBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

