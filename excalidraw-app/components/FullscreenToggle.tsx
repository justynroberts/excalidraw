// Browser fullscreen toggle for the top-right toolbar. Uses the standard
// Fullscreen API with the WebKit-prefixed fallback (Safari), and renders
// nothing where fullscreen isn't available (e.g. iPhone Safari).

import { useEffect, useState } from "react";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const doc = () => document as FullscreenDocument;

const isSupported = () =>
  !!(doc().fullscreenEnabled || doc().webkitFullscreenEnabled);

const currentElement = () =>
  doc().fullscreenElement ?? doc().webkitFullscreenElement ?? null;

const enter = async () => {
  const root = document.documentElement as FullscreenElement;
  if (root.requestFullscreen) {
    await root.requestFullscreen();
  } else {
    await root.webkitRequestFullscreen?.();
  }
};

const exit = async () => {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  } else {
    await doc().webkitExitFullscreen?.();
  }
};

const expandIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const collapseIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const FullscreenToggle = () => {
  const [active, setActive] = useState(() => !!currentElement());

  useEffect(() => {
    // Also covers leaving fullscreen with Esc or the browser's own controls.
    const sync = () => setActive(!!currentElement());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  if (!isSupported()) {
    return null;
  }

  const label = active ? "Exit fullscreen" : "Enter fullscreen";

  return (
    <button
      type="button"
      className="claude-trigger claude-trigger--icon"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={() => {
        (active ? exit() : enter()).catch((error) =>
          console.warn("[fullscreen] toggle failed", error),
        );
      }}
    >
      {active ? collapseIcon : expandIcon}
    </button>
  );
};
