// Scene storage for share links, collaboration rooms and image files: the
// self-hosted replacement for json.excalidraw.com and Firebase.
//
// Everything stored here is encrypted in the browser with a key that never
// reaches the server (it lives in the URL fragment), so this is a plain blob
// store with size limits and path validation.
//
//   POST /api/v2/post/            share-link scene (binary) -> {id}
//   GET  /api/v2/:id              share-link scene
//   PUT  /api/v2/files/<path>     image file, write-once (binary)
//   GET  /api/v2/files/<path>
//   GET  /api/v2/rooms/:roomId    collab room scene (JSON)
//   PUT  /api/v2/rooms/:roomId    {sceneVersion, iv, ciphertext, ifRevision}

import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const SCENE_MAX_BYTES = 20 * 1024 * 1024;
const FILE_MAX_BYTES = 20 * 1024 * 1024;
const ROOM_MAX_BYTES = 30 * 1024 * 1024;

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const SEGMENT_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_FILE_PATH_DEPTH = 6;

const tooLarge = () =>
  Object.assign(new Error("Request body too large"), { status: 413 });

/** Read a request body as a Buffer, refusing anything over `max` bytes. */
export const readBody = (req, max) =>
  new Promise((resolve, reject) => {
    const declared = Number(req.headers["content-length"] || 0);
    if (declared > max) {
      reject(tooLarge());
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(tooLarge());
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

export class SceneStorage {
  constructor({ dataDir, log }) {
    this.dataDir = path.resolve(dataDir);
    this.log = log;
    /** @type {Map<string, Promise<unknown>>} per-room write queues */
    this.locks = new Map();
  }

  /** Serialise work per key so a room's revision check and write are atomic. */
  withLock(key, work) {
    const previous = this.locks.get(key) || Promise.resolve();
    const next = previous.then(work, work);
    const settled = next.catch(() => {});
    this.locks.set(key, settled);
    settled.then(() => {
      if (this.locks.get(key) === settled) {
        this.locks.delete(key);
      }
    });
    return next;
  }

  async init() {
    for (const dir of ["scenes", "files", "rooms"]) {
      await mkdir(path.join(this.dataDir, dir), { recursive: true });
    }
    // Prove the volume is writable at startup, not on the first user's save.
    const probe = path.join(this.dataDir, ".write-test");
    await writeFile(probe, String(Date.now()));
    this.log(`storage: ${this.dataDir}`);
  }

  async writeAtomic(file, data) {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
    await writeFile(tmp, data);
    await rename(tmp, file);
  }

  filePath(segments) {
    if (
      !segments.length ||
      segments.length > MAX_FILE_PATH_DEPTH ||
      !segments.every((s) => SEGMENT_PATTERN.test(s))
    ) {
      return null;
    }
    return path.join(this.dataDir, "files", ...segments);
  }

  /**
   * Handle an /api/v2 request. Returns false when the path isn't a storage
   * route, so the caller can fall through to its 404.
   */
  async handle(req, res, pathname, { sendJSON, onUpload }) {
    if (!pathname.startsWith("/api/v2/")) {
      return false;
    }
    const rest = pathname.slice("/api/v2/".length);

    const sendBytes = (bytes) => {
      res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      res.end(bytes);
    };

    const readOr404 = async (file, send) => {
      try {
        send(await readFile(file));
      } catch (error) {
        if (error.code === "ENOENT") {
          sendJSON(res, 404, { message: "Not found" });
        } else {
          throw error;
        }
      }
    };

    // Share-link scenes
    if (req.method === "POST" && rest === "post/") {
      if (!onUpload(req, res)) {
        return true;
      }
      let body;
      try {
        body = await readBody(req, SCENE_MAX_BYTES);
      } catch (error) {
        if (error.status === 413) {
          sendJSON(res, 413, { error_class: "RequestTooLargeError" });
          return true;
        }
        throw error;
      }
      const id = randomBytes(15).toString("base64url");
      await this.writeAtomic(path.join(this.dataDir, "scenes", id), body);
      sendJSON(res, 200, { id });
      return true;
    }
    if (req.method === "GET" && ID_PATTERN.test(rest)) {
      await readOr404(path.join(this.dataDir, "scenes", rest), sendBytes);
      return true;
    }

    // Image files: write-once, so nobody can replace a file they didn't create
    if (rest.startsWith("files/")) {
      const segments = rest
        .slice("files/".length)
        .split("/")
        .map((s) => decodeURIComponent(s));
      const file = this.filePath(segments);
      if (!file) {
        sendJSON(res, 400, { message: "Invalid file path" });
        return true;
      }
      if (req.method === "GET") {
        await readOr404(file, sendBytes);
        return true;
      }
      if (req.method === "PUT") {
        if (!onUpload(req, res)) {
          return true;
        }
        const exists = await stat(file).then(
          () => true,
          () => false,
        );
        if (exists) {
          req.resume();
          sendJSON(res, 200, { ok: true, existed: true });
          return true;
        }
        const body = await readBody(req, FILE_MAX_BYTES);
        await this.writeAtomic(file, body);
        sendJSON(res, 200, { ok: true });
        return true;
      }
    }

    // Collaboration rooms: optimistic concurrency on a revision counter
    const room = /^rooms\/([A-Za-z0-9_-]{8,128})$/.exec(rest);
    if (room) {
      const file = path.join(this.dataDir, "rooms", `${room[1]}.json`);
      const load = () =>
        readFile(file, "utf8").then(
          (text) => JSON.parse(text),
          () => null,
        );
      if (req.method === "GET") {
        const current = await load();
        if (!current) {
          sendJSON(res, 404, { message: "Not found" });
        } else {
          sendJSON(res, 200, current);
        }
        return true;
      }
      if (req.method === "PUT") {
        if (!onUpload(req, res)) {
          return true;
        }
        let body;
        try {
          body = JSON.parse(
            (await readBody(req, ROOM_MAX_BYTES)).toString("utf8"),
          );
        } catch (error) {
          if (error.status === 413) {
            throw error;
          }
          sendJSON(res, 400, { message: "Invalid JSON" });
          return true;
        }
        if (
          typeof body.iv !== "string" ||
          typeof body.ciphertext !== "string" ||
          typeof body.sceneVersion !== "number"
        ) {
          sendJSON(res, 400, { message: "Invalid room payload" });
          return true;
        }
        await this.withLock(file, async () => {
          const current = await load();
          const revision = current?.revision ?? 0;
          if (Number(body.ifRevision) !== revision) {
            sendJSON(res, 409, { message: "Room changed", revision });
            return;
          }
          const next = {
            revision: revision + 1,
            sceneVersion: body.sceneVersion,
            iv: body.iv,
            ciphertext: body.ciphertext,
          };
          await this.writeAtomic(file, JSON.stringify(next));
          sendJSON(res, 200, { revision: next.revision });
        });
        return true;
      }
    }

    sendJSON(res, 404, { message: "Not found" });
    return true;
  }
}
