import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const MOTION_LIBRARY = ["motion", "motion/react", "framer-motion"];

function layer(files, banned, message, paths = []) {
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: paths.map((name) => ({ name, message })),
          ...(banned.length ? { patterns: [{ group: banned, message }] } : {}),
        },
      ],
    },
  };
}

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  layer(
    ["src/features/**/*.{ts,tsx}"],
    ["@/app/**"],
    "Features cannot depend on the app layer, and take animation primitives from @/motion/lib, never from the library itself.",
    MOTION_LIBRARY,
  ),
  layer(
    ["src/design/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    [],
    "Take animation primitives from @/motion/lib, never from the library itself.",
    MOTION_LIBRARY,
  ),
  layer(
    [
      "src/design/**/*.{ts,tsx}",
      "src/motion/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
    ],
    ["@/app/**", "@/features/**"],
    "design, motion and lib cannot depend on features or the app layer.",
  ),
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @/design/foundations/z-index for layers (z-0/10/20 are fine for local stacking).",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|\\s)-?z-(\\[[^\\]]*\\]|[3-9]\\d|\\d{3,})(\\s|$)/]",
          message:
            "Use Z_INDEX from @/design/foundations/z-index for layers (z-0/10/20 are fine for local stacking).",
        },
        {
          selector:
            "Literal[value=/(^|[\\s:])((duration|delay)-[0-9]+|ease-(in|out|in-out))(\\s|$)/]",
          message:
            "Use the motion token classes (duration-fast, ease-out-quart…) from globals.css instead of raw Tailwind timing.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|[\\s:])((duration|delay)-[0-9]+|ease-(in|out|in-out))(\\s|$)/]",
          message:
            "Use the motion token classes (duration-fast, ease-out-quart…) from globals.css instead of raw Tailwind timing.",
        },
        {
          selector: "Property[key.name='zIndex'][value.type='Literal']",
          message:
            "Use Z_INDEX from @/design/foundations/z-index instead of a literal zIndex.",
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
