import { loadAdminData } from "@/lib/admin-data";
import { buildPostalPdf } from "@/lib/pdf/postal";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const refs = request.nextUrl.searchParams.getAll("ref");
  const todoOnly = request.nextUrl.searchParams.has("todo");
  const { registrations } = await loadAdminData();
  const list = registrations.filter((r) => r.status === "paid" && r.paperTicket && (refs.length === 0 || refs.includes(r.ref)) && (!todoOnly || !r.printedAt));
  if (list.length === 0) return new Response("Nincs postázandó jelentkezés.", { status: 404 });

  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
  const name = list.length === 1 ? `bencesbal-postazas-${list[0].ref}.pdf` : `bencesbal-postazas-${date}.pdf`;
  return new Response(buildPostalPdf(list), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
