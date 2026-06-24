import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Advertir sobre console.log en producción
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Evitar variables declaradas pero no usadas
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // React 17+ no requiere import React
      "react/react-in-jsx-scope": "off",
      // Evitar prop-types (el proyecto usa JS sin TS — sería noise)
      "react/prop-types": "off",
    },
  },
  {
    // Ignorar node_modules y build
    ignores: ["node_modules/**", "dist/**"],
  },
];
