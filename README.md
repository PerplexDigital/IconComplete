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

It's for vite projects so default path is `public/icons/icons.svg` but because it's vite you use `icons/icons.svg` (so without `public/`) in the href.
You can configure the path to your SVG icon file in VS Code settings:

**Default path**: `public/icons/icons.svg`

To override this:

1. Open VS Code Settings (Cmd+, on macOS, Ctrl+, on Windows/Linux)
2. Search for "IconComplete"
3. Set "IconComplete: Icon File Path" to your custom path (relative to workspace root)

Or add to your `.vscode/settings.json`:

```json
{
  "iconComplete.iconFilePath": "path/to/your/icons.svg"
}
```

## How It Works

The extension:
1. Monitors your cursor position in supported file types
2. Detects when you type `#` inside a `href` attribute
3. Reads and parses your SVG sprite file
4. Extracts all `<symbol id="...">` attributes
5. Presents them as autocomplete suggestions

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
