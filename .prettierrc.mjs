export default {
    printWidth: 120,
    singleQuote: true,
    tabWidth: 4,
    singleAttributePerLine: true,
    endOfLine: 'auto',
    overrides: [
        {
            files: ['package.json', '*.yml'],
            options: {
                tabWidth: 2,
            },
        },
    ],
};
