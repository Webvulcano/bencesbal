// Keystroke filters for contact/address fields: they strip what can never be valid,
// the *_RE checks run on submit for what is still incomplete.

// Digits, spaces, "-", "/", "(", ")" and a single leading "+".
export const cleanPhone = (v) => {
  const s = v.replace(/[^\d+\s\-/()]/g, "");
  return (s.startsWith("+") ? "+" : "") + s.replace(/\+/g, "").slice(0, 20);
};
// 8–15 digits, whatever the separators.
export const isValidPhone = (v) => /^\d{8,15}$/.test(v.replace(/\D/g, ""));

export const cleanZip = (v) => v.replace(/\D/g, "").slice(0, 4);
export const ZIP_RE = /^\d{4}$/;

// Starts with a digit; digits, "/", "-", "." and spaces, plus at most one letter (12/A, 3-5, 7B).
export const cleanHouseNo = (v) => {
  let letters = 0;
  return v
    .replace(/^[^\d]+/, "")
    .replace(/[^\d/\-.\sa-záéíóöőúüű]/gi, "")
    .replace(/[a-záéíóöőúüű]/gi, (c) => (letters++ ? "" : c.toUpperCase()))
    .slice(0, 10);
};
