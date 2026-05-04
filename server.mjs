import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3001);

const distClientDir = path.resolve(__dirname, "apps/web/dist/client");
const serverEntryPath = path.resolve(__dirname, "apps/web/dist/server/server.js");

const module = await import(serverEntryPath);
const app = module.default;

if (!app || typeof app.fetch !== "function") {
  throw new Error(`Invalid server entry: ${serverEntryPath}`);
}

function resolveStaticPath(pathname) {
  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPathname.replace(/^\/+/, "");
  if (relativePath.length === 0) {
    return null;
  }

  const absolutePath = path.resolve(distClientDir, relativePath);
  const rootPrefix = distClientDir.endsWith(path.sep)
    ? distClientDir
    : `${distClientDir}${path.sep}`;

  if (absolutePath !== distClientDir && !absolutePath.startsWith(rootPrefix)) {
    return null;
  }

  return absolutePath;
}

async function tryServeStaticAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  const url = new URL(request.url);
  const staticFilePath = resolveStaticPath(url.pathname);

  if (!staticFilePath) {
    return null;
  }

  let fileStat;
  try {
    fileStat = await stat(staticFilePath);
  } catch {
    return null;
  }

  if (!fileStat.isFile()) {
    return null;
  }

  const headers = new Headers();
  if (url.pathname.startsWith("/assets/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return new Response(Bun.file(staticFilePath), { headers });
}

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(request) {
    const staticResponse = await tryServeStaticAsset(request);
    if (staticResponse) {
      return staticResponse;
    }

    return app.fetch(request);
  },
  error(error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Started server: http://${host}:${server.port}`);
