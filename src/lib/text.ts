// Emojis, símbolos y flechas de texto que se usaban como iconos en títulos
// guardados (notificaciones, bitácora). Se quitan al mostrarlos.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{25A0}-\u{25FF}\u{FE0F}\u{200D}]/gu

export function stripEmoji(s: string | null | undefined): string {
  return (s ?? "").replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim()
}
