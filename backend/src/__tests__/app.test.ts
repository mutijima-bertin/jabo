import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "../app";
import { UPLOADS_DIR } from "../services/storage";

/**
 * app.test.ts — deployment-mode upload serving.
 *
 * The load-bearing assertion: with no BLOB_READ_WRITE_TOKEN and no VERCEL=1
 * (the Docker/local path), createApp() MUST keep serving /uploads from disk
 * via express.static — the blob-302 route is only registered on Vercel, and
 * accidentally routing disk-mode reads through it would break local/dev/Docker
 * uploads. Also ensures the environment is clean for every run: a developer
 * shell that exports these vars must not silently flip this test into blob
 * mode (where the file it writes would never be found).
 */

describe("createApp /uploads serving (Docker/local, no Blob env)", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;

    const app = createApp();
    server = app.listen(0);
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("test server started without a TCP address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("serves a real file from UPLOADS_DIR over /uploads (express.static path)", async () => {
    const fileName = `app-static-test-${Date.now()}-${Math.random().toString(16).slice(2)}.bin`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    const bytes = Buffer.from("disk-static-fallback-bytes");
    try {
      fs.writeFileSync(filePath, bytes);

      const res = await fetch(`${baseUrl}/uploads/${fileName}`);
      expect(res.status).toBe(200);
      expect(Buffer.from(await res.arrayBuffer())).toEqual(bytes);
    } finally {
      // Unlink regardless of assertion outcome; only our own temp file.
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* already gone or never created */
      }
    }
  });

  it("404s for missing files exactly like express.static (no blob redirect in disk mode)", async () => {
    const res = await fetch(`${baseUrl}/uploads/definitely-not-a-real-image-${Date.now()}.webp`);
    expect(res.status).toBe(404);
  });
});