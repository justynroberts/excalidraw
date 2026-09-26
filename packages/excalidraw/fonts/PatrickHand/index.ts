// SIL Open Font License 1.1, see OFL.txt. Unmodified Google Fonts subsets
// (via Fontsource), added by this fork.
import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import PatrickHandLatinExt from "./PatrickHand-Regular-latin-ext.woff2";
import PatrickHandLatin from "./PatrickHand-Regular-latin.woff2";

export const PatrickHandFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: PatrickHandLatinExt,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN_EXT },
  },
  {
    uri: PatrickHandLatin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN },
  },
];
