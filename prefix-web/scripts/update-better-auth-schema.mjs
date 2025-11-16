#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const schemaFiles = [
  join(
    process.cwd(),
    "node_modules",
    "@convex-dev",
    "better-auth",
    "src",
    "component",
    "schema.ts",
  ),
  join(
    process.cwd(),
    "node_modules",
    "@convex-dev",
    "better-auth",
    "dist",
    "esm",
    "component",
    "schema.js",
  ),
  join(
    process.cwd(),
    "node_modules",
    "@convex-dev",
    "better-auth",
    "dist",
    "esm",
    "component",
    "schema.d.ts",
  ),
  join(
    process.cwd(),
    "node_modules",
    "@convex-dev",
    "better-auth",
    "dist",
    "commonjs",
    "component",
    "schema.js",
  ),
  join(
    process.cwd(),
    "node_modules",
    "@convex-dev",
    "better-auth",
    "dist",
    "commonjs",
    "component",
    "schema.d.ts",
  ),
];

const tsFieldBlock = (indent) =>
  [
    `${indent}planKey: v.optional(v.union(v.null(), v.string())),`,
    `${indent}polarPlanId: v.optional(v.union(v.null(), v.string())),`,
    `${indent}polarProductId: v.optional(v.union(v.null(), v.string())),`,
    `${indent}polarBenefitId: v.optional(v.union(v.null(), v.string())),`,
    `${indent}polarCreditsPerCycle: v.optional(v.union(v.null(), v.number())),`,
  ].join("\n");

const jsFieldBlock = (indent) =>
  [
    `${indent}planKey: (0, import_convex_values.v)(optional)((0, import_convex_values.v)(union)((0, import_convex_values.v)(null)(), (0, import_convex_values.v)(string)())),`,
    `${indent}polarPlanId: (0, import_convex_values.v)(optional)((0, import_convex_values.v)(union)((0, import_convex_values.v)(null)(), (0, import_convex_values.v)(string)())),`,
    `${indent}polarProductId: (0, import_convex_values.v)(optional)((0, import_convex_values.v)(union)((0, import_convex_values.v)(null)(), (0, import_convex_values.v)(string)())),`,
    `${indent}polarBenefitId: (0, import_convex_values.v)(optional)((0, import_convex_values.v)(union)((0, import_convex_values.v)(null)(), (0, import_convex_values.v)(string)())),`,
    `${indent}polarCreditsPerCycle: (0, import_convex_values.v)(optional)((0, import_convex_values.v)(union)((0, import_convex_values.v)(null)(), (0, import_convex_values.v)(number)())),`,
  ].join("\n");

const processFile = (filePath) => {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error) {
    console.warn(`Skipping schema patch; could not read ${filePath}`);
    return { updated: false, reason: "read_error" };
  }

  if (source.includes("polarPlanId")) {
    return { updated: false, reason: "already_patched" };
  }

  if (filePath.endsWith("schema.ts") || filePath.endsWith("schema.d.ts")) {
    const anchorRegex = /(\s+)userId: v\.optional\(v\.union\(v\.null\(\), v\.string\(\)\)\),/;
    const match = source.match(anchorRegex);
    if (!match) {
      console.warn(`Skipping ${filePath}; anchor not found.`);
      return { updated: false, reason: "anchor_missing" };
    }
    const indent = match[1];
    const next = source.replace(
      anchorRegex,
      (full) => `${full}\n${tsFieldBlock(indent)}`,
    );
    if (next === source) {
      console.warn(`No changes applied to ${filePath}.`);
      return { updated: false, reason: "no_change" };
    }
    writeFileSync(filePath, next, "utf8");
    return { updated: true };
  }

  const jsAnchorRegex =
    /(\s+)userId: \(0, import_convex_values.v\)\(optional\)\(\(0, import_convex_values.v\)\(union\)\(\(0, import_convex_values.v\)\(null\)\(\), \(0, import_convex_values.v\)\(string\)\(\)\)\),/;

  const jsMatch = source.match(jsAnchorRegex);
  if (!jsMatch) {
    console.warn(`Skipping ${filePath}; JS anchor not found.`);
    return { updated: false, reason: "anchor_missing" };
  }

  const jsIndent = jsMatch[1];
  const jsNext = source.replace(
    jsAnchorRegex,
    (full) => `${full}\n${jsFieldBlock(jsIndent)}`,
  );
  if (jsNext === source) {
    console.warn(`No changes applied to ${filePath}.`);
    return { updated: false, reason: "no_change" };
  }
  writeFileSync(filePath, jsNext, "utf8");
  return { updated: true };
};

let changedCount = 0;
for (const file of schemaFiles) {
  const result = processFile(file);
  if (result.updated) {
    console.log(`Patched ${file}`);
    changedCount += 1;
  }
}

if (changedCount === 0) {
  console.log("Better Auth schema already contained Polar checkout fields or could not be patched.");
} else {
  console.log(`Better Auth schema updated with Polar checkout fields in ${changedCount} file(s).`);
}
