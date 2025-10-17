// TODO: Migrar para flat config quando atualizar para ESLint 9+
module.exports = {
    root: true,
    env: { browser: true, es2020: true, node: true },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react-hooks/recommended'
    ],
    ignorePatterns: ['dist', '.eslintrc.cjs', '*.config.ts'],
    parser: '@typescript-eslint/parser',
    plugins: ['react-refresh'],
    settings: {
        react: {
            version: 'detect'
        }
    },
    rules: {
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-console': 'warn'
    }
}