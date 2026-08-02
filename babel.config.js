module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
            "~": "./",
          },
        },
      ],
      ["@babel/plugin-proposal-decorators", { version: "legacy" }],
      "react-native-reanimated/plugin",
    ],
  };
};
