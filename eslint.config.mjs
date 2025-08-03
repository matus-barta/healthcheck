// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from "globals";
import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default tseslint.config(
    includeIgnoreFile(gitignorePath),
    eslint.configs.recommended,
    tseslint.configs.recommended,
    prettier,
    {
        languageOptions: { globals: globals.browser },
        rules: {
            // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
            // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
            'no-undef': 'off'
        }
    },
);