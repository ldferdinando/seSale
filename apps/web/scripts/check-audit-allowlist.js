#!/usr/bin/env node
"use strict";

/**
 * Corre `npm audit --omit=dev --json` y reproduce el gate de
 * `--audit-level=high` (bloquea solo high/critical), salvo los IDs de
 * advisory listados en ALLOWLIST: falsos positivos confirmados, donde el
 * código vulnerable no existe en la versión realmente instalada.
 * Agregar un ID acá exige dejar la investigación en `a_revisar.md`.
 */

const { execSync } = require("node:child_process");

const ALLOWLIST = {
  "GHSA-mrhx-c7xc-m3w5": {
    package: "zod",
    reason:
      "El código vulnerable ($ZodArray/handleArrayResult) es exclusivo del núcleo interno de zod v4; " +
      "la versión instalada (zod 3.x) resuelve a la API clásica v3, que no lo contiene " +
      "(verificado en runtime: z.array(...) usa ZodArray/_def.typeName, no $ZodArray/_zod). " +
      "El advisory de GitHub tiene el rango mal acotado (introduced: 0 en vez de 4.0.0). " +
      "Ver a_revisar.md — 2026-11-06.",
  },
};

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);

function runAudit() {
  try {
    const raw = execSync("npm audit --omit=dev --json", { encoding: "utf8" });
    return JSON.parse(raw);
  } catch (err) {
    if (err.stdout) {
      return JSON.parse(err.stdout);
    }
    console.error("No se pudo correr `npm audit --omit=dev --json`:", err.message);
    process.exit(1);
  }
}

const report = runAudit();
const vulnerabilities = report.vulnerabilities || {};
const blocking = [];
const ignored = [];

for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
  const advisories = (vuln.via || []).filter((v) => typeof v === "object" && v.url);
  for (const advisory of advisories) {
    if (!BLOCKING_SEVERITIES.has(advisory.severity)) continue;

    const id = advisory.url.split("/").pop();
    const entry = ALLOWLIST[id];
    if (entry) {
      ignored.push({ id, package: pkgName, title: advisory.title, reason: entry.reason });
    } else {
      blocking.push({ id, package: pkgName, severity: advisory.severity, title: advisory.title, url: advisory.url });
    }
  }
}

if (ignored.length > 0) {
  console.log("Vulnerabilidades en la allowlist (ignoradas, con justificación documentada):");
  for (const item of ignored) {
    console.log(`  - ${item.id} (${item.package}): ${item.title}`);
    console.log(`    Motivo: ${item.reason}`);
  }
  console.log("");
}

if (blocking.length > 0) {
  console.error("Vulnerabilidades de producción sin resolver ni documentar:");
  for (const item of blocking) {
    console.error(`  - [${item.severity}] ${item.id} (${item.package}): ${item.title} — ${item.url}`);
  }
  console.error(
    "\nFalla el gate (equivalente a npm audit --omit=dev --audit-level=high). " +
      "Arreglar la dependencia o agregar el ID a ALLOWLIST en este script con la justificación en a_revisar.md.",
  );
  process.exit(1);
}

console.log("npm audit (producción): sin vulnerabilidades bloqueantes.");
process.exit(0);
