export function subscribeRealtime({ sb, table, onStatus, onInsert }) {
  let channel = sb.channel(`rt-${table}-${Date.now()}`);

  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table },
    (payload) => {
      if (payload?.new) onInsert?.(payload.new);
    }
  );

  channel.subscribe((status) => {
    onStatus?.(status);
  });

  return {
    async stop() {
      try { await sb.removeChannel(channel); } catch {}
      channel = null;
    }
  };
}
