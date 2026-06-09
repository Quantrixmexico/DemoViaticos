#!/bin/bash
set -e

# ════════════════════════════════════════════════════════════════════
#   Rebranding script — Viáticos
#   Cambia "Grupo Zapata" por el nombre que pases como argumento
#
#   Uso:    bash setup-rebranding.sh "Demo Viáticos"
#           bash setup-rebranding.sh "Mi Empresa"
#
#   Si no pasas nombre, usa "Demo Viáticos" por defecto.
# ════════════════════════════════════════════════════════════════════

NUEVO="${1:-Demo Viáticos}"

echo ""
echo "🔄  Cambiando 'Grupo Zapata' → '$NUEVO' en todo el proyecto..."
echo ""

# Archivos a modificar
ARCHIVOS=(
  "src/app/layout.tsx"
  "src/app/(auth)/login/page.tsx"
  "src/app/(auth)/reset-password/page.tsx"
  "src/components/layout/AppShell.tsx"
  "src/components/ui/InstallBanner.tsx"
  "public/manifest.json"
)

for archivo in "${ARCHIVOS[@]}"; do
  if [ -f "$archivo" ]; then
    # sed con delimitador alterno (|) por si el nombre tiene /
    sed -i "s|Grupo Zapata|$NUEVO|g" "$archivo"
    echo "  ✓ $archivo"
  else
    echo "  ⚠ $archivo no encontrado"
  fi
done

echo ""
echo "📋  Verificando que no queden referencias..."
RESTANTES=$(grep -rn "Grupo Zapata" src/ public/ 2>/dev/null | wc -l || echo "0")

if [ "$RESTANTES" -gt 0 ]; then
  echo "  ⚠ Quedan $RESTANTES referencias:"
  grep -rn "Grupo Zapata" src/ public/ 2>/dev/null | head -5
else
  echo "  ✓ Sin referencias remanentes"
fi

echo ""
echo "🏗️   Verificando build..."
npm run build 2>&1 | grep -E "✓ Compiled|Type error|error" | head -3

echo ""
echo "📦  Commiteando y deployando..."
git add .
git commit -m "rebrand: Grupo Zapata → $NUEVO"
git push

echo ""
echo "✓ Done — '$NUEVO' aplicado en todos los archivos."
echo ""
echo "ℹ️  Notas:"
echo "  • El logo en /public/logo.png NO se cambia automáticamente."
echo "    Si tienes un logo personalizado, reemplaza ese archivo manualmente."
echo "  • El title del navegador se actualiza al recargar la pestaña."
echo "  • La PWA puede mantener el nombre viejo en celulares ya instalados;"
echo "    desinstala y vuelve a instalar para ver el nuevo nombre."
