// Suppress Node.js DEP0205 ("module.register() is deprecated") noise from
// Metro worker processes. Metro loads this file before forking workers, so the
// env var propagates to them regardless of how `expo start` was launched.
process.env.NODE_NO_WARNINGS = "1";

const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const _path = require("node:path");

const config = getDefaultConfig(__dirname);

// metro config removed sql transformer

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file (from previous step)
  cssEntryFile: "./src/styles/global.css",
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: "./uniwind-types.d.ts",
});
