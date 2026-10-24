import { publicEnv } from "@/lib/public-env"

/**
 * Configuración web de Firebase (pública por diseño) y clave VAPID para push.
 * Se leen en tiempo de ejecución (ver src/lib/public-env.ts), así cada
 * despliegue apunta a su propio proyecto de Firebase sin tocar el código.
 */
export function firebaseWeb() {
  return {
    apiKey:            publicEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain:        publicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId:         publicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket:     publicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: publicEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId:             publicEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
  }
}

export function firebaseVapidKey() {
  return publicEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY")
}

/** True si hay proyecto de Firebase configurado; si no, la app no ofrece push. */
export function pushDisponible() {
  const f = firebaseWeb()
  return !!(f.apiKey && f.projectId && f.messagingSenderId && f.appId && firebaseVapidKey())
}
