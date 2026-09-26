// SIL Open Font License 1.1, see OFL.txt. Unmodified Google Fonts subsets
// (via Fontsource), added by this fork.
import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import GochiHandLatin from "./GochiHand-Regular-latin.woff2";

export const GochiHandFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: GochiHandLatin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN },
  },
];
