// Event + business constants. Everything the client might want to tweak lives here.

export const EVENT = {
  name: "XIV. Győri Bencés Bál",
  shortName: "Győri Bencés Bál",
  date: "2027. február 6. (szombat)",
  doors: "17:00",
  start: "18:00 — ünnepélyes megnyitó",
  meetDay: "február 6-ai", // "A február 6-ai találkozásig" in the payment email
  venue: "Czuczor Gergely Bencés Gimnázium",
  venueAddress: "9021 Győr, Széchenyi tér 8.",
  email: "gyoribencesbal@gmail.com",
  dressCode: "Estélyi ruha / sötét öltöny",
  program: [
    ["18:00", "Ünnepélyes megnyitó, nyitótánc"],
    ["20:00", "Vacsora"],
    ["21:30", "Cseh Tamás-est, borozó, söröző"],
    ["23:30", "Tombolahúzás"],
    ["02:00", "Zárás"],
  ],
};

export const BANK = {
  beneficiary: "Bencés Nevelésért Alapítvány",
  bankName: "", // empty → not shown
  iban: "", // empty → not shown
  account: "10700471-22444604-51100005",
};

// Rows shown on the payment step and in the email; empty values are skipped.
export const bankRows = () =>
  [
    ["Kedvezményezett", BANK.beneficiary],
    ["Számlaszám", BANK.bankName ? `${BANK.account} (${BANK.bankName})` : BANK.account],
    ["IBAN", BANK.iban],
  ].filter(([, v]) => v);

export const REF_PREFIX = "GYBB";

// Transfer memo: the registration code we match payments on + "jótékonyság" (the client's wording).
export const memo = (ref) => `${ref}, jótékonyság`;

// Capacity is not here: it lives in the DB (halls.capacity) and is edited on /admin.
export const HALLS = {
  disz: { id: "disz", label: "Díszterem", short: "D", tables: 15, seatsPerTable: 10 },
  kulon: { id: "kulon", label: "Különterem", short: "K", tables: 18, seatsPerTable: 10 },
};

// Late price: from LATE_PRICE_FROM the types with latePrice cost that instead (mirrors ticket_types.late_price/late_from in the DB,
// which is what the registration is actually charged). Before it, the card shows the presale note + the coming price.
export const LATE_PRICE_FROM = "2026-11-16T00:00:00+01:00";
export const LATE_PRICE_LABEL = "11. 16-tól";
export const isLatePrice = (now = new Date()) => now >= new Date(LATE_PRICE_FROM);
export const priceOf = (t, now = new Date()) => (t.latePrice != null && isLatePrice(now) ? t.latePrice : t.price);

export const TICKET_TYPES = [
  { id: "disz", label: "Dísztermi jegy", hall: "disz", price: 50000, latePrice: 55000, note: "kedvezményes időszak: 2026. 10. 25. – 11. 15." },
  { id: "disz_ezust", label: "Ezüst támogatói dísztermi jegy", hall: "disz", price: 70000 },
  { id: "disz_arany", label: "Arany támogatói dísztermi jegy", hall: "disz", price: 80000 },
  { id: "kulon", label: "Különtermi jegy", hall: "kulon", price: 40000, latePrice: 45000, note: "kedvezményes időszak: 2026. 10. 25. – 11. 15." },
  { id: "kulon_ezust", label: "Ezüst támogatói különtermi jegy", hall: "kulon", price: 70000 },
  { id: "kulon_arany", label: "Arany támogatói különtermi jegy", hall: "kulon", price: 80000 },
  // Admin-only: invited guests, never shown on the public form
  { id: "tisztelet_disz", label: "Tiszteletjegy — Díszterem", hall: "disz", price: 0, adminOnly: true },
  { id: "tisztelet_kulon", label: "Tiszteletjegy — Különterem", hall: "kulon", price: 0, adminOnly: true },
];

export const RELATIONS = [
  { id: "oregdiak", label: "Bencés öregdiák" },
  { id: "szulo", label: "Szülő (Czuczor Gergely Bencés Gimnázium és Kollégium)" },
  { id: "munkatars", label: "Munkatárs (Szent Mór Bencés Perjelség / Czuczor intézmény)" },
  { id: "tamogato", label: "A győri bencés közösség ismerőse, támogatója" },
  { id: "egyeb", label: "Egyéb" },
];

export const GUEST_CATEGORIES = ["Díszvendég", "Támogató", "Szervező", "Fellépő", "Egyéb"];

export const SCHOOLS = ["Győr", "Budapest", "Csepel", "Esztergom", "Komárom", "Kőszeg", "Pannonhalma", "Pápa", "Sopron", "Tihany"];
export const ticketType = (id) => TICKET_TYPES.find((t) => t.id === id);


// DL window envelope (A4 folded in thirds), mm from the top-left of the page; Hungarian envelopes have the window on the right
export const ENVELOPE = {
  windowLeft: 100,
  windowTop: 45,
  windowWidth: 90,
  windowHeight: 45,
  foldMarks: [105, 210],
};
