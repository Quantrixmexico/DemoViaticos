import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { InstallBanner } from "@/components/ui/InstallBanner"
import { PWARegister } from "@/components/ui/PWARegister"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  title: "Viáticos Tu empresa AQUI",
  description: "Sistema de gestión de viáticos y gastos corporativos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Viáticos GZ",
  },
  icons: { icon: "/icon-192.png", apple: "/icon-512.png" },
}

export const viewport: Viewport = {
  themeColor: "#05070a",
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
        <meta name="apple-mobile-web-app-title" content="Viáticos GZ" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
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

