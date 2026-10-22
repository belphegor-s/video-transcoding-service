/*
 * Shared between the server layout (which inlines the boot script) and the
 * client provider. Kept free of "use client" so the layout gets real values,
 * not client references.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "vt_theme";

/** Browser chrome colour per theme; mirrors --bg in globals.css. */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#fafaf8",
  dark: "#0b0b0c",
};

/**
 * Runs before first paint so the page never flashes the wrong palette. Also
 * mirrors the preference on <html> so the toggle shows the right icon pre-hydration.
 * Without a stored choice it follows the OS; any failure leaves the CSS
 * default (dark) in place.
 */
export const themeBootScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");if(p!=="light"&&p!=="dark")p="system";var r=p==="system"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;var d=document.documentElement;d.dataset.theme=r;d.dataset.themePref=p;d.style.colorScheme=r;}catch(e){}})();`;
