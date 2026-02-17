import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "*.js",
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': 'error'
    },
  },
  {
    files: ['*.js', 'src/lib/logger.ts'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['**/*.config.*', 'scripts/**', 'src/scripts/**', 'prisma/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off'
    }
  }
]);

export default eslintConfig;
