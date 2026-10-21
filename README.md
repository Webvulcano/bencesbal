# Győri Bencés Bál — jelentkezés

Next.js + Supabase. Éles DB: Supabase projekt `naaekjopbqodntvvpghi`. Lokálisan Dockerben futó Supabase.

## Lokális fejlesztés

Egy parancs az egészhez:

```bash
npm run local
```

Elindítja a Docker Desktopot (ha nem fut), a lokális Supabase-t, majd az appot: **http://localhost:3000** (admin: `/admin`). Leállítás: Ctrl+C, utána `npm run db:stop`.

Külön-külön is megy: `npm run db:start` (DB, első indításkor migrációk + seed), majd `npm run dev` (app).

- Studio (DB admin felület): http://127.0.0.1:54323
- `.env.local` → lokális DB. Felhős (éles) kulcsok: `.env.cloud.local` (nem töltődik be).
- Email lokálisan is a Gmailen megy ki → a seed-adatok mind `@example.com` címek.

| Parancs | Mit csinál |
|---|---|
| `npm run db:start` / `db:stop` | lokális DB indít / leállít (az adat megmarad) |
| `npm run db:reset` | DB törlése és újraépítése: migrációk + `supabase/seed.sql` |
| `npm run db:status` | URL-ek, kulcsok |
| `npm run db:push` | új migrációk felküldése az ÉLES DB-re |

## Kapcsoló: jelentkezés nyitva / zárva

`JELENTKEZES_NYITVA=true` → jelentkező felület. Bármi más / hiányzik → előzetes oldal (`public/elozetes/`). Vercelen átírás után redeploy kell.

## Admin belépés (Google)

`/admin` és minden alútvonala (oldalak, Excel/PDF letöltés, gombok) csak Google-fiókkal érhető el, és csak az engedélyezett címekkel. A jelentkező felülethez nem kell belépés.

- **`ADMIN_EMAILS`** — engedélyezett Google-címek, vesszővel elválasztva (pl. `lehel200@gmail.com`). **Vercelen be kell állítani** (Settings → Environment Variables → Production), utána redeploy. Üres / hiányzik → senki nem léphet be.
- Belépés: `/admin/belepes` → „Belépés Google-fiókkal”. Kilépés gomb a menüben.
- Más Google-fiók is végigmehet a Google-lépésen, de az app kilépteti („nem jogosult”), és a DB-hez a saját sessionjével semmit nem ér el (RLS, nincs policy).

### Beállítás (egyszer)

1. **Google Cloud Console** → APIs & Services
   - OAuth consent screen: External, app név + support email.
   - Credentials → Create credentials → OAuth client ID → *Web application*.
   - Authorized redirect URIs (a Supabase callbackjei, nem az appé):
     - `https://naaekjopbqodntvvpghi.supabase.co/auth/v1/callback`
     - `http://127.0.0.1:54321/auth/v1/callback`
   - Client ID + Client Secret kimásolása.
2. **Supabase dashboard (éles)**
   - Authentication → Sign In / Providers → Google: bekapcsol, Client ID + Secret.
   - Authentication → Sign In / Providers → Email: kikapcsol (csak Google-belépés legyen).
   - Authentication → URL Configuration: Site URL `https://jelentkezes.gyoribencesbal.hu`, Redirect URLs: `https://jelentkezes.gyoribencesbal.hu/admin/auth/callback`.
3. **Lokál**: a projekt gyökerében `.env` fájl (gitignore-olva) a Supabase CLI-nek:
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=...
   ```
   majd `npm run db:stop && npm run db:start`. A `.env.local`-ban `ADMIN_EMAILS=...`. Lokálisan a `http://localhost:3000/admin/belepes` címen lépj be.
4. **Vercel**: `ADMIN_EMAILS` (Production) → redeploy. A régi `ADMIN_PASSWORD` törölhető.

## Statisztika (admin → Statisztika)

Látogatók (Vercel Web Analytics) + jelentkezések/jegyek (saját DB) 7 / 28 / 90 napra, napi grafikon, források, oldalak, eszköz, ország.

- **`VERCEL_TOKEN`** kell hozzá (Vercelen Production env, lokálisan `.env.local` ha ott is látni akarod). Nélküle az oldal működik, csak a látogatói rész üres, és kiírja, hogy mi hiányzik.
  - Létrehozás: Vercel → Account Settings → Tokens → Create. Scope: a bencesbal projekt teamje. Expiration: pl. 1 év (a bál utánig).
  - A token az egész teamhez hozzáfér (Vercelen nincs csak-olvasó token) → csak szerveren van, a böngészőbe nem kerül ki. Ha kiszivárog: Vercelen törlöd, újat csinálsz.
- A projekt/team azonosító be van égetve (`lib/vercel-analytics.js`); felülírható: `VERCEL_ANALYTICS_PROJECT_ID`, `VERCEL_ANALYTICS_TEAM_ID`.
- Előfeltétel: Vercel → bencesbal → Analytics fül → Enable.

## Hibajavítás menete (éles hiba)

1. Hiba reprodukálása lokálisan (`db:reset` után tiszta állapotból).
2. Javítás. Ha DB-t érint: **új** migráció — `npx supabase migration new <nev>`. Régi, már élesre ment migrációt ne írj át.
3. `npm run db:reset` + `npm test` + kézi teszt.
4. Élesítés:
   - DB: egyszer `npx supabase login` és `npx supabase link --project-ref naaekjopbqodntvvpghi`, utána `npm run db:push`.
   - Kód: git push → Vercel deploy.

A migrációs fájlnevek időbélyege egyezik az élesben rögzített verziókkal — így a `db push` csak az újakat küldi fel.
