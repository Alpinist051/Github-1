import globals from 'globals';
import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
    {
        ignores: [
            'node_modules/',
            'dist/',
            'webpack.config.js',
            'eslint.config.mjs',
            '.prettierrc.js',
            '*.user.js',
        ],
    },
    eslintJs.configs.recommended,
    {
        files: ['**/*.ts'],
        extends: [...tseslint.configs.recommendedTypeChecked],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^', varsIgnorePattern: '^' },
            ],
        },
    },
    eslintPluginPrettierRecommended
);
