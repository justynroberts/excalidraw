// Browse and import Excalidraw's public libraries (libraries.excalidraw.com)
// from the AI panel. Each library is the work of its listed authors and is
// published on that site; imports go into the local library, credited.

import { useEffect, useMemo, useState } from "react";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const LIBRARY_SITE =
  (import.meta.env.VITE_APP_LIBRARY_URL as string | undefined) ||
  "https://libraries.excalidraw.com";
const INDEX_URL = `${LIBRARY_SITE}/libraries.json`;
const fileUrl = (path: string) => `${LIBRARY_SITE}/libraries/${path}`;

type LibraryEntry = {
  id?: string;
  name: string;
  description: string;
  authors: { name: string; url?: string }[];
  source: string;
  preview: string;
  updated: string;
};

// Architecture and system-design sets first; everything else by recency.
const FEATURED = [
  "Software Architecture",
  "System Design Components",
  "System Design Template",
  "AWS Architecture Icons",
  "Azure cloud services icons",
  "Cloud Design Patterns",
  "Architecture floor plan symbols",
  "Shapes for UML & ER Diagrams",
  "Network topology icons",
  "Hexagonal Architecture",
  "Dev Ops Icons",
  "Wardley Maps Symbols",
];

const MAX_RESULTS = 40;

export const LibraryTemplates = ({
  api,
}: {
  api: ExcalidrawImperativeAPI | null;
}) => {
  const [open, setOpen] = useState(false);
  const [libraries, setLibraries] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());

  // Load the index only once the section is first opened.
  useEffect(() => {
    if (!open || libraries || error) {
      return;
    }
    const controller = new AbortController();
    fetch(INDEX_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((list: LibraryEntry[]) => setLibraries(list))
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("[templates] library index failed", err);
          setError("Couldn't load the Excalidraw library index.");
        }
      });
    return () => controller.abort();
  }, [open, libraries, error]);

  const visible = useMemo(() => {
    if (!libraries) {
      return [];
    }
    const q = query.trim().toLowerCase();
    const matches = q
      ? libraries.filter((lib) =>
          `${lib.name} ${lib.description} ${lib.authors
            .map((a) => a.name)
            .join(" ")}`
            .toLowerCase()
            .includes(q),
        )
      : libraries;
    const rank = (lib: LibraryEntry) => {
      const featured = FEATURED.indexOf(lib.name);
      return featured === -1 ? FEATURED.length : featured;
    };
    return [...matches]
      .sort((a, b) => rank(a) - rank(b) || b.updated.localeCompare(a.updated))
      .slice(0, MAX_RESULTS);
  }, [libraries, query]);

  const addLibrary = async (lib: LibraryEntry) => {
    if (!api) {
      return;
    }
    setAdding(lib.source);
    try {
      const response = await fetch(fileUrl(lib.source));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      await api.updateLibrary({
        libraryItems: await response.blob(),
        merge: true,
        openLibraryMenu: true,
        defaultStatus: "published",
      });
      setAdded((prev) => new Set(prev).add(lib.source));
    } catch (err) {
      console.error("[templates] library import failed", lib.name, err);
      api.setToast({
        message: `Couldn't import "${lib.name}".`,
        closable: true,
      });
    } finally {
      setAdding(null);
    }
  };

  return (
    <details
      className="claude-panel__templates"
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary>
        Templates
        <span className="claude-panel__muted">
          {" "}
          · Excalidraw libraries{libraries ? ` (${libraries.length})` : ""}
        </span>
      </summary>

      <input
        type="search"
        className="claude-panel__search"
        placeholder="Search: aws, uml, floor plan…"
        aria-label="Search Excalidraw libraries"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
      />

      {error && <p className="claude-panel__error">{error}</p>}
      {open && !libraries && !error && (
        <p className="claude-panel__muted">Loading…</p>
      )}

      <ul>
        {visible.map((lib) => (
          <li key={lib.source} className="claude-panel__template">
            <img
              src={fileUrl(lib.preview)}
              alt=""
              loading="lazy"
              width={56}
              height={40}
            />
            <div>
              <span className="claude-panel__template-name">{lib.name}</span>
              <span className="claude-panel__muted">
                {lib.authors.map((a) => a.name).join(", ")}
              </span>
            </div>
            <button
              type="button"
              className="claude-panel__chip"
              disabled={!api || adding === lib.source}
              onClick={() => addLibrary(lib)}
            >
              {added.has(lib.source)
                ? "Added"
                : adding === lib.source
                ? "Adding"
                : "Add"}
            </button>
          </li>
        ))}
      </ul>

      <p className="claude-panel__muted claude-panel__credit">
        Community libraries from{" "}
        <a href={LIBRARY_SITE} target="_blank" rel="noopener">
          libraries.excalidraw.com
        </a>
        , credited to their authors. Also: Library → Browse libraries, or drop
        any .excalidraw / .excalidrawlib file on the canvas.
      </p>
    </details>
  );
};
