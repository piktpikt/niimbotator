// PIKT: Known/paired printers for 1-tap reconnect (Roadmap P2). CRUD over the Dexie `knownPrinters`
// table + a live list for the connection sheet. A printer becomes "known" once we've connected to it
// via Capacitor BLE (the only transport we can reconnect to by id).
import { liveQuery, type Observable } from "dexie";
import { db, type KnownPrinter, type PrinterTransport } from "$/db/schema";

/** Known printers, most-recently-connected first (live). */
export const knownPrinters: Observable<KnownPrinter[]> = liveQuery(() =>
  db.knownPrinters.orderBy("lastConnectedAt").reverse().toArray(),
);

/** Upsert a printer we just connected to, bumping its lastConnectedAt (keeps the original createdAt). */
export async function rememberPrinter(p: {
  id: string;
  name: string;
  transport: PrinterTransport;
  modelCode?: number;
  modelName?: string;
}): Promise<void> {
  const now = Date.now();
  const existing = await db.knownPrinters.get(p.id);
  await db.knownPrinters.put({
    id: p.id,
    name: p.name,
    transport: p.transport,
    modelCode: p.modelCode,
    modelName: p.modelName,
    createdAt: existing?.createdAt ?? now,
    lastConnectedAt: now,
  });
}

/** Forget a known printer. */
export async function forgetPrinter(id: string): Promise<void> {
  await db.knownPrinters.delete(id);
}

/** The most recently connected known printer, if any (for opt-in auto-reconnect). */
export async function mostRecentPrinter(): Promise<KnownPrinter | undefined> {
  return db.knownPrinters.orderBy("lastConnectedAt").reverse().first();
}
