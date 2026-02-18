export async function fetchHistory({ sb, table = "sensor_data", limitLast = 2000, sessionId = "" }) {
  let q = sb
    .from(table)
    .select("ts,sensor_type,x_value,y_value,session_id")
    .order("ts", { ascending: true })
    .limit(Math.max(1, Math.min(20000, Number(limitLast) || 2000)));

  if (sessionId) q = q.eq("session_id", sessionId);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
