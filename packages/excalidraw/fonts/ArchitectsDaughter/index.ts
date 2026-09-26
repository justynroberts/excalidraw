// SIL Open Font License 1.1, see OFL.txt. Unmodified Google Fonts subsets
// (via Fontsource), added by this fork.
import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

import ArchitectsDaughterLatinExt from "./ArchitectsDaughter-Regular-latin-ext.woff2";
import ArchitectsDaughterLatin from "./ArchitectsDaughter-Regular-latin.woff2";

export const ArchitectsDaughterFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: ArchitectsDaughterLatinExt,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN_EXT },
  },
  {
    uri: ArchitectsDaughterLatin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN },
  },
];
