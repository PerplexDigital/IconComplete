# IconComplete

A VS Code extension that provides intelligent autocomplete for SVG icon references in `<use href="">` attributes.

## Features

- **Smart Autocomplete**: Triggers automatically when typing `#` inside a `href` attribute of a `<use>` element
- **SVG Symbol Detection**: Automatically scans your SVG sprite file and extracts all `<symbol>` IDs
- **Configurable Path**: Customize the icon file path per project
- **Performance**: Caches icon IDs for fast autocomplete

## Usage

Type `#` after `/icons/icons.svg` in any `<use href="">` attribute:

```
<svg class="icon">
    <use href="/icons/icons.svg#" />
</svg>
```

The extension automatically enables quick suggestions in HTML, CSHTML, Vue, Svelte and React files. When you type `#` after the SVG path, autocomplete will automatically appear with available icon IDs from your SVG sprite file.

You can also manually trigger autocomplete at any time:
- **macOS**: `Option + Esc` or `Cmd + I`
- **Windows/Linux**: `Ctrl + Space`

## Configuration

The extension automatically detects your project configuration:

- **Nuxt projects**: Automatically finds `nuxt.config.*` and looks for icons at `[project-root]/public/icons/icons.svg`
- **Vite projects with custom root**: Reads the `root` option from `vite.config.*` and looks for icons at `[vite-root]/public/icons/icons.svg`
- **Standard projects**: Falls back to `public/icons/icons.svg` from workspace root

**Important**: The extension always looks for icons at `/public/icons/icons.svg` relative to your project or Vite root. The path you use in your `href` attribute is ignored - the extension automatically determines the correct file location based on your build configuration.

### Manual Configuration

You can manually configure the path to your SVG icon file in VS Code settings if needed:

1. Open VS Code Settings (Cmd+, on macOS, Ctrl+, on Windows/Linux)
2. Search for "IconComplete"
3. Set "IconComplete: Icon File Path" to your custom path (relative to workspace root)

Or add to your `.vscode/settings.json`:

```json
{
  "iconComplete.iconFilePath": "path/to/your/icons.svg"
}
```

### Example Configurations

**Nuxt Project:**
- Config: `nuxt.config.ts` at project root
- Icons location: `[project-root]/public/icons/icons.svg`
- In your code: `<use href="/icons/icons.svg#home" />`

**Vite Project with Custom Root:**
```javascript
// vite.config.mts
export default {
  root: 'src'
}
```
- Icons location: `[project-root]/src/public/icons/icons.svg`
- In your code: `<use href="/dist/icons/icons.svg#home" />` (or any path)

The extension ignores the href path and uses the build configuration to find the actual icon file.

## How It Works

The extension:
1. Monitors your cursor position in supported file types
2. Detects when you type `#` inside a `href` attribute
3. Automatically finds your Vite or Nuxt config file
4. Determines the correct icon file location (`public/icons/icons.svg` relative to your project/build root)
5. Reads and parses your SVG sprite file
6. Extracts all `<symbol id="...">` attributes
7. Presents them as autocomplete suggestions

**Note**: The path you use in your `href` attribute (e.g., `/icons/icons.svg` or `/dist/icons/icons.svg`) doesn't affect where the extension looks for the icon file. It always uses your build configuration to find the actual file location.

## Development

To run the extension in development mode:

1. Clone the repository
2. Run `npm install`
3. Press F5 to open a new VS Code window with the extension loaded
4. Test the autocomplete in a file containing and `<svg><use href="/icons/icons.svg# /></svg>`

## Building

```bash
npm run compile
```

## License

MIT
