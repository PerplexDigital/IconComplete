# IconComplete Tests

This directory contains the test suite for the IconComplete VS Code extension.

## Running Tests

### From Command Line

Run all tests:

```bash
pnpm test
```

### From VS Code

1. Open the Run and Debug panel (Cmd+Shift+D / Ctrl+Shift+D)
2. Select "Extension Tests" from the dropdown
3. Click the green play button or press F5

## Manual Testing

### Quick Start

1. **Open the Extension in Debug Mode**
    - Press `F5` in VS Code (opens a new Extension Development Host window)
    - Or use the menu: Run > Start Debugging

2. **In the New Window**
    - Open the `test-nuxt/app/app.vue` file
    - Type `#` after `/icons/icons.svg` in any `<use href="">` attribute
    - The autocomplete should automatically trigger showing available icons

3. **Manual Trigger**
    - If autocomplete doesn't appear automatically, press `Option + Esc` (Mac) or `Ctrl + Space` (Windows/Linux)

### Test Scenarios

**Test 1: Default Icon Path**

- Extension looks for icons at `public/icons/icons.svg` by default
- Test file includes 10 icons

**Test 2: Custom Icon Path**

1. In Extension Development Host, open Settings (Cmd+,)
2. Search for "IconComplete"
3. Change "Icon File Path" to a different path
4. Create an SVG file there with `<symbol>` tags
5. Autocomplete should show icons from the new location

**Test 3: Multiple File Types**

- Works in: HTML (`.html`), CSHTML (`.cshtml`), Vue (`.vue`), JSX (`.jsx`), TSX (`.tsx`)

## Automated Test Coverage

The test suite includes:

### 1. **Extension Activation Tests**

- Verifies extension is present in VS Code
- Checks extension activates correctly
- Confirms completion provider registration

### 2. **Completion Provider Tests**

- Tests completions appear after `#` in `href` attributes
- Verifies correct icon IDs are suggested
- Ensures completions only appear in appropriate contexts
- Validates completion item metadata (kind, detail)

### 3. **Configuration Tests**

- Checks default configuration values
- Tests custom `iconFilePath` configuration

### 4. **SVG Parsing Tests**

- Tests extraction of symbol IDs from SVG content
- Handles edge cases (empty SVG, no symbols)

### 5. **Path Resolution Tests**

- Verifies paths starting with `/` resolve correctly
- Tests public folder convention

### 6. **Trigger Character Tests**

- Confirms `#` character triggers completions

## Test Structure

```
src/test/
├── runTest.ts              # Test runner entry point
└── suite/
    ├── index.ts            # Test suite loader
    └── extension.test.ts   # Main test suite
```

## Writing New Tests

Tests use the Mocha framework with TDD style:

```typescript
suite('Test Suite Name', () => {
    test('Test case description', () => {
        // Your test code
        assert.strictEqual(actual, expected);
    });
});
```

### Setup and Teardown

Use `setup()` and `teardown()` for test fixtures:

```typescript
suite('My Tests', () => {
    let testFile: string;

    setup(() => {
        // Runs before each test
        testFile = createTestFile();
    });

    teardown(() => {
        // Runs after each test
        cleanupTestFile(testFile);
    });
});
```

## Test Fixtures

Tests use the existing `test-nuxt` workspace:

- `test-nuxt/app/app.vue` - Vue file with icon references
- `test-nuxt/public/icons/icons.svg` - SVG sprite with 10 test icons

## Debugging Tests

1. Set breakpoints in test files or extension code
2. Run tests in debug mode (F5 with "Extension Tests" selected)
3. Use the Debug Console for evaluation
4. Check the Output panel → "IconComplete" channel for extension logs

## Continuous Integration

Tests run automatically on:

- Pre-commit (via husky hooks)
- Before publishing the extension (`pretest` script)

## Common Issues

### Tests fail to find extension

- Ensure `package.json` has correct `publisher` and `name` fields
- The extension ID is `<publisher>.<name>`

### Completion provider not triggering

- Ensure document is opened and active
- Wait for extension activation to complete
- Check the "IconComplete" output channel for debug logs
