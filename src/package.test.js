import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);

test("package metadata targets the public npm package name", () => {
  assert.equal(packageJson.name, "iris-simple-website-bot");
  assert.equal(packageJson.publishConfig?.access, "public");
});

test("package style export points at the Vite library stylesheet", () => {
  assert.equal(packageJson.exports["./style.css"], "./dist/iris-simple-website-bot.css");
});
