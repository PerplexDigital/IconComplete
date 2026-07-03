# IconComplete

A VS Code extension that provides intelligent autocomplete for SVG icon references in `<use href="">` attributes.

## Features

- **Smart Autocomplete**: Triggers automatically when typing `#` inside a `href` attribute of a `<use>` element
- **SVG Symbol Detection**: Automatically scans your SVG sprite file and extracts all `<symbol>` IDs
- **Configurable Path**: Customize the icon file path per project (a configured path always takes priority over auto-detection)
- **Multiple Sprites**: Merge symbols from several SVG files, de-duplicated by id. The picker groups icons under each file name, sorted alphabetically
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

If you configure an explicit path, it always takes priority. Otherwise the extension auto-detects the icon file:

- **Nuxt projects**: Automatically finds `nuxt.config.*` and looks for icons at `[project-root]/public/icons/icons.svg`
- **Vite projects with custom root**: Reads the `root` option from `vite.config.*` and looks for icons at `[vite-root]/public/icons/icons.svg`
- **Standard projects**: Falls back to `public/icons/icons.svg` from workspace root

**Important**: When no path is configured, the path you use in your `href` attribute is ignored - the extension automatically determines the file location based on your build configuration.

### Manual Configuration

Configure one or more SVG icon files in VS Code settings. A configured path always wins over auto-detection.

1. Open VS Code Settings (Cmd+, on macOS, Ctrl+, on Windows/Linux)
2. Search for "IconComplete"
3. Set "IconComplete: Icon File Paths" to your custom path(s) (relative to workspace root)

Or add to your `.vscode/settings.json`:

```json
{
    "iconComplete.iconFilePaths": ["public/icons/fa-solid-used.svg", "public/icons/fa-regular-used.svg"]
}
```

Icons from all listed files are merged. On duplicate ids, the first file wins.

> The legacy single-path setting `iconComplete.iconFilePath` is still supported but deprecated. Prefer `iconComplete.iconFilePaths`.

### Example Configurations

**Nuxt Project:**

- Config: `nuxt.config.ts` at project root
- Icons location: `[project-root]/public/icons/icons.svg`
- In your code: `<use href="/icons/icons.svg#home" />`

**Vite Project with Custom Root:**

```javascript
// vite.config.mts
export default {
    root: 'src',
};
```

- Icons location: `[project-root]/src/public/icons/icons.svg`
- In your code: `<use href="/dist/icons/icons.svg#home" />` (or any path)

The extension ignores the href path and uses the build configuration to find the actual icon file.

## How It Works

The extension:

1. Monitors your cursor position in supported file types
2. Detects when you type `#` inside a `href` attribute
3. Uses your configured path(s) if set, otherwise finds your Vite or Nuxt config file to determine the default location (`public/icons/icons.svg` relative to your project/build root)
4. Reads and parses each SVG sprite file, merging symbols de-duplicated by id
5. Extracts all `<symbol id="...">` attributes
6. Presents them as autocomplete suggestions

**Note**: When no path is configured, the path you use in your `href` attribute (e.g., `/icons/icons.svg` or `/dist/icons/icons.svg`) doesn't affect where the extension looks for the icon file. It uses your build configuration to find the actual file location.

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
