const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("node:path");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve .sql files
config.resolver.sourceExts.push("sql");

// Transform .sql files as raw text strings (required for Drizzle migrations)
config.transformer = {
  ...config.transformer,
  babelTransformerPath: path.resolve(
    __dirname,
    "src/db/utils/sqlTransformer.js",
  ),
};

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file (from previous step)
  cssEntryFile: "./src/styles/global.css",
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: "./uniwind-types.d.ts",
});
