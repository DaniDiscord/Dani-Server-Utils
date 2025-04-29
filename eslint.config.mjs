import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import tsEslint from "typescript-eslint";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default tsEslint.config({
  files: ["**/*.ts"],
  plugins: {
    prettier: prettierPlugin,
    "@typescript-eslint": tsPlugin,
  },
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  rules: {
    ...prettierConfig.rules,
    ...tsPlugin.configs.recommended.rules,
    "jsx-a11y/href-no-hash": ["off"],
    "spaced-comment": ["error", "always"],
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
    "max-len": [
      "warn",

      {
        code: 90,
        tabWidth: 2,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "sort-imports": [
      "error",
      {
        ignoreCase: false,
        ignoreDeclarationSort: false,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
        allowSeparatedGroups: false,
      },
    ],
  },
});
