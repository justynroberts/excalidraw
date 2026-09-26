// SIL Open Font License 1.1, see OFL.txt. Unmodified Google Fonts subsets
// (via Fontsource), added by this fork.
import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import GloriaHallelujahLatinExt from "./GloriaHallelujah-Regular-latin-ext.woff2";
import GloriaHallelujahLatin from "./GloriaHallelujah-Regular-latin.woff2";

export const GloriaHallelujahFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: GloriaHallelujahLatinExt,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN_EXT },
  },
  {
    uri: GloriaHallelujahLatin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN },
  },
];
