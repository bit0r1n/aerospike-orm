// @ts-check
import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig(
    globalIgnores([ 'eslint.config.mjs', 'dist', 'types', '*.js' ]),
    eslint.configs.recommended,
    stylistic.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        globals: {
          ...globals.node,
        },
        sourceType: 'module',
        parserOptions: {
          projectService: true,
        },
      },
    },
    {
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        'no-empty': [ 'error', { 'allowEmptyCatch': true } ],
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-empty-object-type': [
          'warn',
          { allowObjectTypes: 'always' }
        ],
        '@stylistic/array-bracket-spacing': [ 'error', 'always' ],
        '@stylistic/brace-style': [ 'error', '1tbs', { allowSingleLine: true } ],
        '@stylistic/arrow-parens': [ 'error', 'always' ],
      },
    },
)