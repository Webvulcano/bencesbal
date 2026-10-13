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

export const NAVY = [17, 34, 80];
export const GOLD = [205, 172, 67];
export const MUTED = [110, 110, 120];
export const INK = [25, 25, 30];
