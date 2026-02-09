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
  {
    // Project-wide stricter rules
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': 'error'
    },
    overrides: [
      // Allow console only in our logger file
      {
        files: ['src/lib/logger.ts'],
        rules: {
          'no-console': 'off'
        }
      },
      // Relax rules for config and scripts
      {
        files: ['**/*.config.*', 'scripts/**', 'prisma/**'],
        rules: {
          'no-console': 'off'
        }
      }
    ]
  }
]);

export default eslintConfig;
