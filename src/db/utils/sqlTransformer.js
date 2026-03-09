// Custom Metro transformer that returns .sql files as raw text strings.
// Required for Drizzle ORM migrations to work with Expo / React Native.
// See: https://orm.drizzle.team/docs/get-started/expo-new

const upstreamTransformer = require("@expo/metro-config/babel-transformer");

module.exports.transform = async function transform({
  src,
  filename,
  options,
}) {
  if (filename.endsWith(".sql")) {
    const code = `module.exports = ${JSON.stringify(src)};`;
    return upstreamTransformer.transform({ src: code, filename, options });
  }
  return upstreamTransformer.transform({ src, filename, options });
};
