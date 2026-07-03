import { defineConfig } from 'vite-plus';

const ignorePatterns = ['out/**', 'test-cshtml/**', 'test-nuxt/**'];

export default defineConfig({
    fmt: {
        ignorePatterns,
        printWidth: 120,
        singleQuote: true,
        singleAttributePerLine: true,
        sortTailwindcss: {},
        tabWidth: 4,
        overrides: [
            {
                files: ['*.yml', '*.yaml'],
                options: {
                    tabWidth: 2,
                },
            },
        ],
    },
    lint: {
        ignorePatterns,
        jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
        rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
        options: { typeAware: true, typeCheck: true },
    },
    staged: {
        '*': 'vp check --fix',
    },
});
