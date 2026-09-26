// SIL Open Font License 1.1, see OFL.txt. Unmodified Google Fonts subsets
// (via Fontsource), added by this fork.
import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import CaveatLatinExt from "./Caveat-Regular-latin-ext.woff2";
import CaveatLatin from "./Caveat-Regular-latin.woff2";

export const CaveatFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: CaveatLatinExt,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN_EXT },
  },
  {
    uri: CaveatLatin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN },
  },
];
