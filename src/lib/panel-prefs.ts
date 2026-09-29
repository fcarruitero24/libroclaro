/**
 * Cookie con el estado del menú lateral del panel ("plegado" | "abierto").
 * Vive fuera de los componentes de cliente porque la leen los dos lados:
 * el navegador la escribe al plegar y el layout del servidor la lee para
 * pintar el menú como lo dejó el usuario, sin parpadeo.
 */
export const COOKIE_MENU = "lc_menu";
