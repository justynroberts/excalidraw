// SIL Open Font License 1.1, see OFL.txt. Unmodified Google Fonts subsets
// (via Fontsource), added by this fork.
import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import KalamLatinExt from "./Kalam-Regular-latin-ext.woff2";
import KalamLatin from "./Kalam-Regular-latin.woff2";

export const KalamFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: KalamLatinExt,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN_EXT },
  },
  {
    uri: KalamLatin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN },
  },
];
