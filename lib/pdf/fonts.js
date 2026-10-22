import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

const FONTS = [
  ["Inter_400Regular.ttf", "Inter", "normal"],
  ["Inter_700Bold.ttf", "Inter", "bold"],
  ["PlayfairDisplay_700Bold.ttf", "Playfair", "bold"],
  ["PlayfairDisplay_400Regular_Italic.ttf", "Playfair", "italic"],
];
const fontData = FONTS.map(([file, family, style]) => [
  file,
  family,
  style,
  readFileSync(path.join(process.cwd(), "public", "fonts", file)).toString("base64"),
]);

export function registerFonts(doc) {
  for (const [file, family, style, b64] of fontData) {
    doc.addFileToVFS(file, b64);
    doc.addFont(file, family, style);
  }
}

// Same palette as gyoribencesbal.hu / the jelentkezés form (.bal theme) and the emails.
export const ACCENT = [181, 149, 47]; // bal-gold-dark #b5952f
export const GOLD = [212, 175, 55]; // bal-gold #d4af37
export const CREAM = [250, 248, 242]; // bal-subtle #faf8f2
export const BORDER = [229, 217, 194]; // bal-border #e5d9c2
export const MUTED = [107, 107, 107];
export const INK = [34, 34, 34]; // bal-ink #222222
