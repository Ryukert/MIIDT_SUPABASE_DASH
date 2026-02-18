export async function fetchHistory({ sb, table, limitLast = 2000, sessionId = "" }) {
  let q = sb.from(table).select("*").order("ts", { ascending: false }).limit(limitLast);

  if (sessionId) q = q.eq("session_id", sessionId);

  const { data, error } = await q;
  if (error) throw error;

  // Regresar cronológico (viejo -> nuevo)
  return (data || []).slice().reverse();
}
