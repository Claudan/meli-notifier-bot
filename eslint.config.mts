import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "cdk.out/**", "eslint.config.mts"],
  },
  {
    files: ["**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      prettierConfig,
    ],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    rules: {
      "prettier/prettier": "error",
    },
    plugins: {
      prettier: require("eslint-plugin-prettier"),
    },
  },
]);
