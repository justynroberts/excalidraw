// SIL Open Font License 1.1, see OFL.txt. Unmodified Google Fonts subsets
// (via Fontsource), added by this fork.
import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import ShadowsIntoLightLatinExt from "./ShadowsIntoLight-Regular-latin-ext.woff2";
import ShadowsIntoLightLatin from "./ShadowsIntoLight-Regular-latin.woff2";

export const ShadowsIntoLightFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: ShadowsIntoLightLatinExt,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN_EXT },
  },
  {
    uri: ShadowsIntoLightLatin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN },
  },
];
