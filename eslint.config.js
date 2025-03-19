import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        window: "readonly",
        document: "readonly",
        atob: "readonly",
        clearTimeout: "readonly",
        setTimeout: "readonly",
        console: "readonly",
        BroadcastChannel: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-undef": "off", // ✅ Disables `no-undef`
      "@typescript-eslint/no-explicit-any": "off" // ✅ Allows `any`
    },
  },
];
