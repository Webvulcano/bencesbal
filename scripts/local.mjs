// `npm run local`: whole local test environment in one command.
// Docker Desktop (started if needed) → local Supabase → Next.js dev server on port 3000.
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";

const PORT = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dockerUp = () => spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;
const fail = (msg) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

// 1. Docker
if (!dockerUp()) {
  console.log("Docker Desktop indítása…");
  spawnSync("open", ["-a", "Docker"]);
  for (let i = 0; i < 60 && !dockerUp(); i++) await sleep(2000);
  if (!dockerUp()) fail("A Docker Desktop 2 perc alatt sem indult el. Indítsd el kézzel, és futtasd újra.");
}

// 2. Port 3000 must be free, so the app is always on the same address.
const free = await new Promise((resolve) => {
  const s = net.createServer().once("error", () => resolve(false));
  s.listen(PORT, () => s.close(() => resolve(true)));
});
if (!free) {
  const who = spawnSync("lsof", ["-iTCP:" + PORT, "-sTCP:LISTEN", "-n", "-P"], { encoding: "utf8" }).stdout;
  fail(`A ${PORT}-es port foglalt (fut már egy app?). Állítsd le, aztán futtasd újra.\n\n${who}`);
}

// 3. Local Supabase (no-op if already running)
console.log("Lokális Supabase indítása…");
if (spawnSync("npx", ["supabase", "start"], { stdio: "inherit" }).status !== 0) fail("A lokális Supabase nem indult el (ld. fent).");

console.log(`
──────────────────────────────────────────────
  App (admin):  http://localhost:${PORT}/admin
  Jelentkezés:  http://localhost:${PORT}
  DB (Studio):  http://127.0.0.1:54323

  Leállítás:    Ctrl+C (app), utána  npm run db:stop  (DB)
──────────────────────────────────────────────
`);

// 4. App
const app = spawn("npx", ["next", "dev", "-p", String(PORT)], { stdio: "inherit" });
app.on("exit", (code) => {
  if (code) console.error("\n✗ Az app leállt. Ha fent „Another next dev server is already running” áll: az app már fut a kiírt címen — használd azt, vagy állítsd le (kill <PID>), és futtasd újra.\n");
  process.exit(code ?? 0);
});
