const KEY = "miidt_supabase_cfg_v1";

export function createSbClient(url, anon) {
  if (!window.supabase?.createClient) {
    throw new Error("Supabase JS no cargó. Revisa el script CDN en index.html");
  }
  return window.supabase.createClient(url, anon, {
    auth: { persistSession: false }
  });
}

export function saveSupabaseCfg(cfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}

export function loadSupabaseCfg() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
