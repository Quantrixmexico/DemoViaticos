import { NextResponse } from "next/server"
import { firebaseWeb } from "@/lib/firebase-public"
import { BRAND } from "@/lib/brand"

/** Service worker de Firebase Messaging con la configuración del proyecto inyectada. */
const swContent = () => { const FIREBASE_WEB = firebaseWeb(); return `
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js")

firebase.initializeApp(${JSON.stringify({
  apiKey: FIREBASE_WEB.apiKey, projectId: FIREBASE_WEB.projectId,
  messagingSenderId: FIREBASE_WEB.messagingSenderId, appId: FIREBASE_WEB.appId,
})})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const { t: title, b: body, url } = payload.data || {}
  self.registration.showNotification(title || ${JSON.stringify(BRAND.nombreCorto)}, {
    body: body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: url || "/dashboard" },
    vibrate: [200, 100, 200],
  })
})

self.addEventListener("notificationclick", e => {
  e.notification.close()
  const url = e.notification.data?.url || "/dashboard"
  e.waitUntil(clients.openWindow(url))
})
` }

export async function GET() {
  return new NextResponse(swContent(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
