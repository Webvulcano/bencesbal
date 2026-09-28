// Event + business constants. Everything the client might want to tweak lives here.

export const EVENT = {
  name: "XIII. Győri Bencés Bál",
  shortName: "Győri Bencés Bál",
  date: "2027. február 6. (szombat)",
  doors: "18:30",
  start: "19:00 — ünnepélyes megnyitó",
  venue: "Czuczor Gergely Bencés Gimnázium",
  venueAddress: "9021 Győr, Széchenyi tér 8.",
  email: "gyoribencesbal@gmail.com",
  dressCode: "Estélyi ruha / sötét öltöny",
  program: [
    ["19:00", "Ünnepélyes megnyitó, nyitótánc"],
    ["20:00", "Vacsora"],
    ["21:30", "Cseh Tamás-est, borozó, söröző"],
    ["23:30", "Tombolahúzás"],
    ["02:00", "Zárás"],
  ],
};

export const BANK = {
  beneficiary: "Győri Bencés Diákokért Alapítvány",
  bankName: "OTP Bank",
  iban: "HU42 1170 5008 2045 1234 0000 0000",
  account: "11705008-20451234",
};

export const PAYMENT_DEADLINE_DAYS = 8;

export const REF_PREFIX = "GYBB";

export const HALLS = {
  disz: { id: "disz", label: "Díszterem", short: "D", capacity: 171, tables: 18, seatsPerTable: 10 },
  kulon: { id: "kulon", label: "Különterem", short: "K", capacity: 233, tables: 24, seatsPerTable: 10 },
};

export const TICKET_TYPES = [
  { id: "disz", label: "Dísztermi jegy", hall: "disz", price: 50000 },
  { id: "disz_ezust", label: "Ezüst támogatói dísztermi jegy", hall: "disz", price: 70000 },
  { id: "disz_arany", label: "Arany támogatói dísztermi jegy", hall: "disz", price: 100000 },
  { id: "kulon", label: "Különtermi jegy", hall: "kulon", price: 40000 },
  { id: "kulon_ezust", label: "Ezüst támogatói különtermi jegy", hall: "kulon", price: 70000 },
  { id: "kulon_arany", label: "Arany támogatói különtermi jegy", hall: "kulon", price: 100000 },
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

export const SCHOOLS = ["Győr", "Budapest", "Csepel", "Esztergom", "Komárom", "Kőszeg", "Pannonhalma", "Pápa", "Sopron", "Tihany"];
export const ticketType = (id) => TICKET_TYPES.find((t) => t.id === id);


// DL window envelope (A4 folded in thirds), mm from the top-left of the page
export const ENVELOPE = {
  windowLeft: 20,
  windowTop: 45,
  windowWidth: 90,
  windowHeight: 45,
  foldMarks: [105, 210],
};
