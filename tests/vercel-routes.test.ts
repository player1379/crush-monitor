import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, request, type RequestListener } from "node:http";
import { once } from "node:events";

async function callRoute(
  handler: RequestListener,
  path: string,
  method: string,
  body?: unknown,
) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    return await new Promise<{ status: number; json: () => unknown }>(
      (resolve, reject) => {
        const req = request(
          {
            hostname: "127.0.0.1",
            port: address.port,
            path,
            method,
            headers: {
              Origin: "https://example.vercel.app",
              Host: "example.vercel.app",
              "X-Forwarded-Proto": "https",
              ...(body === undefined
                ? {}
                : { "Content-Type": "application/json" }),
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () =>
              resolve({
                status: res.statusCode ?? 0,
                json: () => JSON.parse(Buffer.concat(chunks).toString("utf8")),
              }),
            );
          },
        );
        req.on("error", reject);
        req.end(body === undefined ? undefined : JSON.stringify(body));
      },
    );
  } finally {
    server.close();
  }
}

test("Vercel publishes a health function at /api/health", async () => {
  const path = "../api/health";
  const { default: handler } = await import(path);
  const response = await callRoute(handler, "/api/health", "GET");
  assert.equal(response.status, 200);
  assert.equal(
    typeof (response.json() as { configured: boolean }).configured,
    "boolean",
  );
});

test("Vercel routes same-origin analysis requests to validation", async () => {
  const path = "../api/analyze";
  const { default: handler } = await import(path);
  const response = await callRoute(handler, "/api/analyze", "POST", {});
  assert.equal(response.status, 400);
  assert.match((response.json() as { error: string }).error, /聊天结构/);
});
