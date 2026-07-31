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
      ["@babel/plugin-proposal-decorators", { legacy: true }],
      "react-native-reanimated/plugin",
    ],
  };
};
