import js from "@eslint/js";
import type { ESLint, Rule } from "eslint";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const returnTypes = (tseslint.plugin as ESLint.Plugin).rules?.[
  "explicit-function-return-type"
] as Rule.RuleModule;

/**
 * Tells a React component from a plain function by React's naming convention.
 *
 * @param node - The function the return-type rule reports.
 * @returns `true` when the function, or the variable it is assigned to, has a name that starts with a capital letter.
 */
function isComponent(node: Rule.Node): boolean {
  const parent = node.parent;
  const name =
    node.type === "FunctionDeclaration"
      ? node.id?.name
      : parent?.type === "VariableDeclarator" && parent.id.type === "Identifier"
        ? parent.id.name
        : undefined;

  return name !== undefined && /^[A-Z]/.test(name);
}

/**
 * `@typescript-eslint/explicit-function-return-type`, without its reports on React components.
 */
const plainFunctionReturnTypes: Rule.RuleModule = {
  ...returnTypes,
  create(context) {
    return returnTypes.create(
      Object.create(context, {
        report: {
          value: (descriptor: Rule.ReportDescriptor & { node: Rule.Node }) => {
            if (!isComponent(descriptor.node)) {
              context.report(descriptor);
            }
          },
        },
      }),
    );
  },
};

export default defineConfig([
  globalIgnores(["dist", "docs", ".claude", ".vercel"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      parserOptions: { ecmaFeatures: { jsx: true } },
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
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "error",
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: {
      local: {
        rules: { "explicit-function-return-type": plainFunctionReturnTypes },
      },
    },
    rules: {
      "local/explicit-function-return-type": "error",
    },
  },
  prettier,
  {
    rules: {
      curly: ["error", "all"],
    },
  },
]);
