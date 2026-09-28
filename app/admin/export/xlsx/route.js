import { loadAdminData } from "@/lib/admin-data";
import { buildXlsx } from "@/lib/export-xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  const buf = await buildXlsx(await loadAdminData());
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bencesbal-resztvevok-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
