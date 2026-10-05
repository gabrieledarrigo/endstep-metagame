import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "docs", ".claude"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      curly: ["error", "all"],
    },
  },
  {
    files: ["src/**"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["api/**", "*.config.{js,ts}"],
    languageOptions: { globals: globals.node },
  },
  prettier,
]);
