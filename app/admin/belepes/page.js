import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { EVENT } from "@/lib/constants";
import { loginWithGoogle } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS = {
  jogosultsag: "Nincs jogosultsága belépni az admin felületre. Kérjük, vegye fel a kapcsolatot az adminnal.",
  sikertelen: "A belépés nem sikerült, kérjük, próbálja újra.",
};

export default async function Belepes({ searchParams }) {
  if (await isAdmin()) redirect("/admin");
  const { hiba } = await searchParams;
  return (
    <div className="max-w-sm mx-auto mt-16 bg-white border border-line/70 border-t-4 border-t-gold rounded-lg p-6">
      <p className="font-serif italic text-gold text-2xl leading-tight">{EVENT.name}</p>
      <h1 className="text-navy-2 font-bold text-lg mt-1 mb-5">Admin belépés</h1>
      {ERRORS[hiba] && <p className="text-sm text-sold font-semibold mb-4">{ERRORS[hiba]}</p>}
      <form action={loginWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-md bg-navy-2 text-white px-4 py-2 font-bold hover:brightness-110 cursor-pointer"
        >
          Belépés Google-fiókkal
        </button>
      </form>
    </div>
  );
}
