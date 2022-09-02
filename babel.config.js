/* eslint-disable prettier/prettier, @typescript-eslint/no-var-requires */
/* eslint global-require: off */
const fs = require("fs");

const developmentEnvironments = ["development", "test"];

const developmentPlugins = [require("@babel/plugin-transform-runtime")];
const productionPlugins = [require("babel-plugin-dev-expression")];

const folders = fs
  .readdirSync("./src/", { withFileTypes: true })
  .filter((direct) => direct.isDirectory());

const alias = {};

for (const folder of folders) {
  alias[folder.name] = `./src/${folder.name}`;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
module.exports = (api) => {
  // See docs about api at https://babeljs.io/docs/en/config-files#apicache
  const development = api.env(developmentEnvironments);

  return {
    presets: [
      // @babel/preset-env will automatically target our browserslist targets
      require("@babel/preset-env"),
      require("@babel/preset-typescript"),
    ],
    plugins: [
      // Stage 0
      require("@babel/plugin-proposal-function-bind"),
      [
        require("babel-plugin-module-resolver"),
        {
          extenstions: [".ts", ".tsx", ".js", ".jsx", "cjs", "mjs"],
          root: ["./src/"],
          alias,
        },
      ],

      // Stage 1
      require("@babel/plugin-proposal-export-default-from"),
      require("@babel/plugin-proposal-logical-assignment-operators"),
      [require("@babel/plugin-proposal-optional-chaining"), { loose: false }],
      [require("@babel/plugin-proposal-pipeline-operator"), { proposal: "minimal" }],
      [require("@babel/plugin-proposal-nullish-coalescing-operator"), { loose: false }],
      require("@babel/plugin-proposal-do-expressions"),

      // Stage 2
      [require("@babel/plugin-proposal-decorators"), { legacy: true }],
      require("@babel/plugin-proposal-function-sent"),
      require("@babel/plugin-proposal-export-namespace-from"),
      require("@babel/plugin-proposal-numeric-separator"),
      require("@babel/plugin-proposal-throw-expressions"),

      // Stage 3
      require("@babel/plugin-syntax-dynamic-import"),
      require("@babel/plugin-syntax-import-meta"),
      [require("@babel/plugin-proposal-class-properties"), { loose: false }],
      require("@babel/plugin-proposal-json-strings"),

      ...(development ? developmentPlugins : productionPlugins),
    ],
  };
};
