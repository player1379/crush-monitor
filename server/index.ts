import express from "express";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import app from "./app";
import { providerStatus } from "./provider-config";

const dist = join(dirname(fileURLToPath(import.meta.url)), "../dist");
app.use(express.static(dist));
app.get("/", (_req, res) => res.sendFile(join(dist, "index.html")));

const port = Number(process.env.PORT || 3178);
app.listen(port, process.env.HOST || "127.0.0.1", () => {
  const status = providerStatus();
  console.log(`Crush API: http://${process.env.HOST || "127.0.0.1"}:${port}`);
  console.log(
    status.configured
      ? `Jev: ${status.provider} · ${status.model} · Key configured (not yet verified)`
      : status.error,
  );
});
