export const THEME_KEY = "guffin-theme";

/**
 * Runs in <head> before first paint, so the page never flashes the wrong
 * theme. Keep it dependency free; it is inlined as text.
 */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_KEY}");var t=c==="light"||c==="dark"?c:matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})()`;
