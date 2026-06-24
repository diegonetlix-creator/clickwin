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
    // Archivos de configuración de Node (vite, postcss, tailwind) — usan globals Node
    files: ["vite.config.*", "postcss.config.*", "tailwind.config.*", "eslint.config.*"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
  {
    // Ignorar node_modules, build, supabase CLI output y scripts CJS
    ignores: ["node_modules/**", "dist/**", "supabase/**", "**/*.cjs", "tailwind.config.*", "postcss.config.*", "task bloom-export/**"],
  },
];
