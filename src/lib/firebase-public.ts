/**
 * Configuración web de Firebase (pública por diseño) y clave VAPID para push.
 * Se leen de variables NEXT_PUBLIC_* en tiempo de build, así cada despliegue
 * apunta a su propio proyecto de Firebase sin tocar el código.
 */
export const FIREBASE_WEB = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
}

export const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? ""

/** True si hay proyecto de Firebase configurado; si no, la app no ofrece push. */
export const PUSH_DISPONIBLE = !!(FIREBASE_WEB.apiKey && FIREBASE_WEB.projectId && FIREBASE_WEB.messagingSenderId && FIREBASE_WEB.appId && FIREBASE_VAPID_KEY)
