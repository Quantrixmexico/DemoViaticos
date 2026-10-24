"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { Bell, X } from "lucide-react"
import { stripEmoji } from "@/lib/text"
import { Toast } from "@/components/ui/Toast"
import { firebaseWeb, firebaseVapidKey, pushDisponible } from "@/lib/firebase-public"

interface Props { userId: string }
type Status = "idle" | "asking" | "granted" | "denied"

let globalSetup: (() => void) | null = null
export function triggerNotifSetup() { globalSetup?.() }

export function PushNotifications({ userId }: Props) {
  // Sin proyecto de Firebase configurado no se ofrece push (ver src/lib/firebase-public.ts)
  if (!pushDisponible()) return null
  return <PushNotificationsInner userId={userId}/>
}

function PushNotificationsInner({ userId }: Props) {
  const [status, setStatus]   = useState<Status>("idle")
  const [banner, setBanner]   = useState(false)
  const [toast, setToast]     = useState<{ title: string; body: string } | null>(null)
  const [aviso, setAviso]     = useState<string | null>(null)
  const fbReadyRef            = useRef(false)
  const messagingRef          = useRef<any>(null)

  const loadFirebase = useCallback((): Promise<void> => new Promise((resolve, reject) => {
    if (fbReadyRef.current) { resolve(); return }
    const load = (src: string): Promise<void> => new Promise((res, rej) => {
      const s = document.createElement("script")
      s.src = src; s.async = true
      s.onload = () => res(); s.onerror = () => rej(new Error(`Failed to load ${src}`))
      document.head.appendChild(s)
    })
    load("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
      .then(() => load("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"))
      .then(() => {
        const fb = (window as any).firebase
        if (!fb) { reject(new Error("Firebase not available")); return }
        if (!fb.apps?.length) fb.initializeApp(firebaseWeb())
        messagingRef.current = fb.messaging()
        fbReadyRef.current = true
        messagingRef.current.onMessage((payload: any) => {
          const { t: title, b: body } = payload.data || {}
          if (title) { setToast({ title, body: body||"" }); setTimeout(() => setToast(null), 5000) }
        })
        resolve()
      })
      .catch(reject)
  }), [])

  const registerToken = useCallback(async () => {
    try {
      await loadFirebase()

      // Explicitly register Firebase SW and pass it to getToken
      let swReg: ServiceWorkerRegistration | undefined
      try {
        swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/firebase-cloud-messaging-push-scope/" })
        await navigator.serviceWorker.ready
        console.log("[FCM] Firebase SW registered:", swReg.scope)
      } catch(e) {
        console.warn("[FCM] Could not register firebase SW, using default:", e)
      }

      const token = await messagingRef.current?.getToken({
        vapidKey: firebaseVapidKey(),
        ...(swReg ? { serviceWorkerRegistration: swReg } : {}),
      })

      if (!token) { console.warn("[FCM] No token returned - check VAPID key and permissions"); return }

      console.log("[FCM] Token:", token.slice(0, 30) + "...")

      const res = await fetch("/api/push/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.ok) {
        console.log("[FCM] Token saved to DB")
        localStorage.setItem("notif-status", "granted")
      } else {
        console.error("[FCM] DB save failed:", data)
      }
    } catch(e: any) {
      console.error("[FCM] registerToken error:", e?.message || e)
    }
  }, [loadFirebase])

  const handleActivar = useCallback(async () => {
    if (!("Notification" in window)) { setAviso("⚠ Este navegador no admite notificaciones push"); setTimeout(() => setAviso(null), 4000); return }
    setStatus("asking"); setBanner(false)
    try {
      const perm = await Notification.requestPermission()
      if (perm === "granted") {
        setStatus("granted")
        await registerToken()
      } else {
        setStatus("denied")
        localStorage.setItem("notif-status", "denied")
      }
    } catch(e: any) {
      console.error("[FCM] handleActivar error:", e?.message || e)
      setStatus("idle")
    }
  }, [registerToken])

  useEffect(() => { globalSetup = handleActivar; return () => { globalSetup = null } }, [handleActivar])

  useEffect(() => {
    if (!userId || typeof window === "undefined") return
    if (!("Notification" in window)) return

    const perm = Notification.permission
    if (perm === "granted") {
      setStatus("granted")
      registerToken() // Always refresh token
      return
    }
    if (perm === "denied") { setStatus("denied"); return }

    const saved = localStorage.getItem("notif-status")
    if (saved === "denied") { setStatus("denied"); return }

    const t = setTimeout(() => setBanner(true), 3000)
    return () => clearTimeout(t)
  }, [userId, registerToken])

  const handleDismiss = () => { setBanner(false); localStorage.setItem("notif-status", "later") }

  return (
    <>
      {banner && status === "idle" && (
        <div className="notif-banner" role="dialog" aria-label="Activar notificaciones">
          <div className="notif-banner-icon"><Bell size={19} strokeWidth={1.75}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="notif-banner-title">¿Te avisamos de tus solicitudes?</div>
            <div className="notif-banner-text">Una notificación cuando se autorice, libere o devuelva una solicitud.</div>
          </div>
          <div className="notif-banner-actions">
            <button className="btn primary sm" onClick={handleActivar}>Activar</button>
            <button className="btn ghost sm" onClick={handleDismiss}>Ahora no</button>
          </div>
        </div>
      )}

      <Toast message={status === "asking" ? "ℹ Acepta el permiso en el mensaje del navegador" : aviso}/>

      {toast && (
        <div className="notif-pop" role="status">
          <div className="notif-banner-icon" style={{ width: 34, height: 34 }}><Bell size={16} strokeWidth={1.75}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="notif-pop-title">{stripEmoji(toast.title)}</div>
            {toast.body && <div className="notif-pop-body">{stripEmoji(toast.body)}</div>}
          </div>
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setToast(null)} aria-label="Cerrar">
            <X size={14} strokeWidth={2}/>
          </button>
        </div>
      )}
    </>
  )
}
