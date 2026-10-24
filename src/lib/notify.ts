// Envía notificaciones push a través de /api/push/notify.
// El Worker de FCM y su secreto solo los conoce el servidor.

export async function notifyUsers(
  userIds: string[],
  title: string,
  body: string,
  path = "/dashboard"
) {
  if (!userIds.length) return
  try {
    const res = await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds, title, body, path }),
    })
    const data = await res.json().catch(() => null)
    console.info("[Notify]", res.status, data)
  } catch (err) {
    console.warn("[Notify] Failed to send push:", err)
  }
}
