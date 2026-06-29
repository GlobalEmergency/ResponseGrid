import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Honor the `_`-prefix convention for intentionally-unused bindings, e.g.
  // Server Action signatures `(_prev, _formData)` that ignore those arguments.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Guardrail (#174): forbid bare `Date` `toLocale*` formatting. It renders in
  // the browser's LOCAL tz while SSR renders in UTC, so a near-midnight date
  // mismatches between server and client → React #418 hydration error. Use the
  // deterministic helper `@/lib/format-date` (formatDate/formatDateTime) or the
  // `<LocalDate>` atom instead.
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]",
          message:
            "Usa el helper formatDate/formatDateTime de @/lib/format-date o el atom <LocalDate> (evita el mismatch de hidratación #418).",
        },
      ],
    },
  },
  // Allow-list: the single-source date helper (the one place that calls
  // toLocale* on purpose, pinned to UTC) and the distance badge (a NUMBER/km
  // format, not a date — `Number.prototype.toLocaleString`).
  {
    files: ["**/lib/format-date.ts", "**/components/atoms/distance-badge.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
