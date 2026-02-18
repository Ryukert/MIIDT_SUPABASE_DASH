export function subscribeRealtime({ sb, table, onInsert, onStatus } = {}) {
  const channel = sb.channel(`realtime:${table}`);

  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table },
    (payload) => {
      const row = payload?.new;
      if (row) onInsert?.(row);
    }
  );

  channel.subscribe((status) => {
    onStatus?.(String(status || ""));
  });

  return {
    stop: async () => {
      try { await sb.removeChannel(channel); } catch {}
    }
  };
}
