/**
 * Identidad de la instalación. Cambia aquí el nombre de la empresa y del
 * producto; el resto de la app (login, barra lateral, PWA, manifiesto) lo lee de este archivo.
 * public/manifest.json no puede importarlo: mantenlo a mano con los mismos valores.
 */
export const BRAND = {
  /** Nombre de la empresa que usa el sistema */
  empresa: "Tu empresa AQUI",
  /** Nombre del producto tal como aparece en la barra lateral y el título de la pestaña */
  producto: "Demo Viáticos",
  /** Nombre corto para el icono de la app instalada (iOS/Android) */
  nombreCorto: "Viáticos",
  /** Línea bajo el nombre en la barra lateral */
  lema: "Gastos de viaje",
  descripcion: "Sistema de gestión de viáticos y gastos corporativos",
  /** Ejemplo que se muestra en el campo de correo del login */
  correoEjemplo: "usuario@tuempresa.com",
  /** Colores de la interfaz del sistema (barra de estado, pantalla de arranque) */
  colorOscuro: "#05070a",
  colorClaro: "#f5f5f7",
} as const
