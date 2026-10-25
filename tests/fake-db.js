// Tiny in-memory stand-in for the Supabase admin client: just the calls the app makes.
export function fakeDb(regs) {
  const byRef = new Map(regs.map((r) => [r.ref, r]));
  const calls = { rpc: [], updates: [] };

  const query = (table) => {
    const q = { table, filters: [], patch: null };
    const api = {
      select: () => api,
      update: (patch) => ((q.patch = patch), api),
      eq: (col, val) => (q.filters.push([col, [val]]), api),
      in: (col, vals) => (q.filters.push([col, vals]), q.patch ? run() : api),
      single: () => {
        const ref = q.filters.find(([c]) => c === "ref")?.[1][0];
        const r = byRef.get(ref);
        return Promise.resolve(r ? { data: structuredClone(r), error: null } : { data: null, error: { message: "not found" } });
      },
      then: (res, rej) => run().then(res, rej),
    };
    const run = () => {
      if (q.patch) {
        calls.updates.push({ table, patch: q.patch, filters: q.filters });
        const [col, vals] = q.filters[0];
        if (table === "registrations") for (const r of byRef.values()) if (vals.includes(r[col])) Object.assign(r, q.patch);
        if (table === "tickets") for (const r of byRef.values()) for (const t of r.tickets) if (vals.includes(t[col])) Object.assign(t, q.patch);
      }
      return Promise.resolve({ data: null, error: null });
    };
    return api;
  };

  const rpc = (fn, args) => {
    calls.rpc.push({ fn, args });
    if (fn === "mark_paid") byRef.get(args.p_ref).status = "paid";
    if (fn === "cancel_registration") byRef.get(args.p_ref).status = "cancelled";
    if (fn === "create_registration") return Promise.resolve({ data: "GYBB-0042", error: null });
    if (fn === "admin_create_registration") {
      if (!args.payload.contact?.email) return Promise.resolve({ data: null, error: { message: "EMAIL_REQUIRED" } });
      return Promise.resolve({ data: "GYBB-0099", error: null });
    }
    return Promise.resolve({ data: null, error: null });
  };

  return { from: query, rpc, calls, byRef };
}
