const LS_KEY = "miidt_supabase_cfg_v1";

export function createSbClient(url, anon) {
  if (!url || !anon) throw new Error("Falta URL o ANON KEY");
  if (!window.supabase?.createClient) throw new Error("No cargó supabase-js (window.supabase.createClient)");

  return window.supabase.createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 30 } },
  });
}

export function saveSupabaseCfg(cfg) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch {}
}

export function loadSupabaseCfg() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
