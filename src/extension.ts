import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const iconCache: Map<string, IconData[]> = new Map();
let outputChannel: vscode.OutputChannel;

interface IconQuickPickItem extends vscode.QuickPickItem {
    iconId: string;
}

interface IconGroup {
    file: string;
    icons: IconData[];
}

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('IconComplete');
    outputChannel.appendLine('IconComplete extension is now active');

    // Register command to show icon picker
    const showIconPickerCommand = vscode.commands.registerCommand('iconComplete.showIconPicker', async () => {
        await showIconPicker();
    });

    // Register text document change listener to auto-trigger on '#'
    const changeDisposable = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (event.contentChanges.length === 0) return;

        const change = event.contentChanges[0];
        if (change.text !== '#') return;

        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== event.document) return;

        // The position after the # is typed
        const position = change.range.end;
        const linePrefix = editor.document.lineAt(position.line).text.substring(0, position.character + 1);

        outputChannel.appendLine(`# typed at position: ${position.line}:${position.character}`);
        outputChannel.appendLine(`Line prefix after #: "${linePrefix}"`);

        // Match patterns like: href="/path/to/icons.svg#
        const hrefPattern = /href=["']([^"'#]*\.svg)#$/;
        if (hrefPattern.test(linePrefix)) {
            outputChannel.appendLine('Pattern matched! Triggering icon picker...');
            // Trigger the icon picker after a short delay
            setTimeout(() => {
                vscode.commands.executeCommand('iconComplete.showIconPicker');
            }, 100);
        } else {
            outputChannel.appendLine('Pattern did not match');
        }
    });

    context.subscriptions.push(showIconPickerCommand, changeDisposable);
}

async function showIconPicker() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const position = editor.selection.active;
    const linePrefix = editor.document.lineAt(position).text.substring(0, position.character);

    outputChannel.appendLine(`Icon picker triggered at position: ${position.line}:${position.character}`);
    outputChannel.appendLine(`Line prefix: "${linePrefix}"`);

    // Match patterns like: href="/path/to/icons.svg#" or href="/icons/icons.svg#"
    const hrefPattern = /href=["']([^"'#]*\.svg)#([^"']*)$/;
    const match = hrefPattern.exec(linePrefix);

    if (!match) {
        outputChannel.appendLine('No matching href pattern found');
        vscode.window.showWarningMessage('Place cursor after # in an SVG href attribute');
        return;
    }

    const svgPath = match[1];
    const existingText = match[2];
    outputChannel.appendLine(`Found SVG path: "${svgPath}", existing text: "${existingText}"`);

    // Get icon data grouped by source file
    const { groups: iconGroups, paths } = await getIconData(svgPath);
    const totalIcons = iconGroups.reduce((sum, g) => sum + g.icons.length, 0);

    if (totalIcons === 0) {
        outputChannel.appendLine('No icon IDs found');
        vscode.window.showWarningMessage(
            `No icons found. Checked ${paths.length} file(s): ${paths.join(', ')}. ` +
                'Verify the paths in iconComplete.iconFilePaths exist and contain <symbol> elements.',
        );
        return;
    }

    outputChannel.appendLine(`Found ${totalIcons} icons`);

    // Create QuickPick
    const quickPick = vscode.window.createQuickPick<IconQuickPickItem>();
    quickPick.placeholder = 'Search for an icon...';
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = false;

    // Build items: a separator header per file, followed by its icons
    const items: IconQuickPickItem[] = [];
    for (const group of iconGroups) {
        items.push({
            label: group.file,
            kind: vscode.QuickPickItemKind.Separator,
            iconId: '',
        });
        for (const { id, symbolElement } of group.icons) {
            items.push({
                label: id,
                alwaysShow: false,
                iconId: id,
                iconPath: symbolElement ? createIconDataUri(symbolElement) : undefined,
            });
        }
    }
    quickPick.items = items;

    // Set initial filter if there's existing text
    if (existingText) {
        quickPick.value = existingText;
    }

    quickPick.onDidChangeSelection(async (selection) => {
        if (selection[0]) {
            await insertIcon(editor, position, linePrefix, selection[0].iconId);
            quickPick.hide();
        }
    });

    quickPick.onDidHide(() => quickPick.dispose());
    quickPick.show();
}

async function insertIcon(editor: vscode.TextEditor, position: vscode.Position, linePrefix: string, iconId: string) {
    // Find the position of the # and any existing text after it
    const hashMatch = linePrefix.match(/#([^"']*)$/);
    if (!hashMatch) return;

    const hashPosition = linePrefix.lastIndexOf('#') + 1;
    const existingTextLength = hashMatch[1].length;

    // Calculate the range to replace
    const startPos = position.with(undefined, hashPosition);
    const endPos = position.with(undefined, hashPosition + existingTextLength);
    const range = new vscode.Range(startPos, endPos);

    await editor.edit((editBuilder) => {
        editBuilder.replace(range, iconId);
    });

    outputChannel.appendLine(`Inserted icon: ${iconId}`);
}

interface IconData {
    id: string;
    symbolElement: string;
}

async function findViteRoot(): Promise<string | null> {
    // Nuxt's officially supported config file extensions
    // See: https://nuxt.com/docs/guide/directory-structure/nuxt-config
    // "The nuxt.config file extension can either be .js, .ts or .mjs"
    const nuxtConfigNames = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];

    // Vite's own list of config files (from vite/dist/node/chunks/logger.js)
    // This matches Vite's internal DEFAULT_CONFIG_FILES constant
    const viteConfigNames = [
        'vite.config.js',
        'vite.config.mjs',
        'vite.config.ts',
        'vite.config.cjs',
        'vite.config.mts',
        'vite.config.cts',
    ];

    // First, check for Nuxt config files
    for (const configName of nuxtConfigNames) {
        const configFiles = await vscode.workspace.findFiles(`**/${configName}`, '**/node_modules/**', 10);

        for (const configFile of configFiles) {
            // For Nuxt projects, the root is the same directory as nuxt.config
            // (public folder is at the project root, not in a src folder)
            const configDir = path.dirname(configFile.fsPath);
            outputChannel.appendLine(`Found Nuxt config in ${configName}: root is "${configDir}"`);
            return configDir;
        }
    }

    // Search for vite config files in the workspace
    for (const configName of viteConfigNames) {
        const configFiles = await vscode.workspace.findFiles(`**/${configName}`, '**/node_modules/**', 10);

        for (const configFile of configFiles) {
            try {
                const content = fs.readFileSync(configFile.fsPath, 'utf-8');

                // Try to extract root property from the config
                // Match patterns like: root: 'path', root: "path", or root: `path`
                const rootMatch = content.match(/root\s*:\s*['"`]([^'"`]+)['"`]/);

                if (rootMatch) {
                    const rootPath = rootMatch[1];
                    const configDir = path.dirname(configFile.fsPath);
                    const absoluteRoot = path.resolve(configDir, rootPath);
                    outputChannel.appendLine(`Found Vite root in ${configName}: "${rootPath}" -> "${absoluteRoot}"`);
                    return absoluteRoot;
                }
            } catch (error) {
                outputChannel.appendLine(`Error reading ${configName}: ${error}`);
            }
        }
    }

    outputChannel.appendLine('No Vite or Nuxt root found in config files');
    return null;
}

// Resolve the configured icon file(s) to absolute paths, or null when nothing is configured.
function getConfiguredIconPaths(workspaceRoot: string): string[] | null {
    const config = vscode.workspace.getConfiguration('iconComplete');

    // New array setting takes priority.
    const arr = config.inspect<string[]>('iconFilePaths');
    const explicitPaths = arr?.workspaceFolderValue ?? arr?.workspaceValue ?? arr?.globalValue;
    if (explicitPaths && explicitPaths.length > 0) {
        return explicitPaths.map((p) => path.join(workspaceRoot, p));
    }

    // Legacy single-path setting (kept for backward compatibility).
    const single = config.inspect<string>('iconFilePath');
    const explicitPath = single?.workspaceFolderValue ?? single?.workspaceValue ?? single?.globalValue;
    if (explicitPath) {
        return [path.join(workspaceRoot, explicitPath)];
    }

    return null;
}

async function getIconData(_svgPathInHref: string): Promise<{ groups: IconGroup[]; paths: string[] }> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        outputChannel.appendLine('No workspace folder found');
        return { groups: [], paths: [] };
    }
    const workspaceRoot = workspaceFolder.uri.fsPath;

    // An explicitly configured path always wins over auto-detection.
    let paths = getConfiguredIconPaths(workspaceRoot);
    if (paths) {
        outputChannel.appendLine(`Using configured icon files: ${paths.join(', ')}`);
    } else {
        // No explicit setting: derive the default location from the Vite/Nuxt root.
        const viteRoot = await findViteRoot();
        const base = viteRoot ?? workspaceRoot;
        paths = [path.join(base, 'public', 'icons', 'icons.svg')];
        outputChannel.appendLine(`Using default icon file: "${paths[0]}"`);
    }

    // Group icons by source file, de-duplicating by id across files (first file wins),
    // and sort each group's icons alphabetically.
    const seen = new Set<string>();
    const groups: IconGroup[] = [];
    for (const fullPath of paths) {
        const icons = readIconFile(fullPath)
            .filter((icon) => !seen.has(icon.id) && (seen.add(icon.id), true))
            .sort((a, b) => a.id.localeCompare(b.id));
        if (icons.length > 0) {
            groups.push({ file: path.basename(fullPath, '.svg'), icons });
        }
    }

    const total = groups.reduce((sum, g) => sum + g.icons.length, 0);
    outputChannel.appendLine(`Merged ${total} icons from ${paths.length} file(s)`);
    return { groups, paths };
}

function readIconFile(fullPath: string): IconData[] {
    if (iconCache.has(fullPath)) {
        outputChannel.appendLine(`Using cached icon data for "${fullPath}"`);
        return iconCache.get(fullPath)!;
    }

    try {
        if (!fs.existsSync(fullPath)) {
            const message = `Icon file not found: ${fullPath}`;
            outputChannel.appendLine(message);
            vscode.window.showWarningMessage(message);
            return [];
        }

        const svgContent = fs.readFileSync(fullPath, 'utf-8');
        const iconData = parseIconData(svgContent);
        outputChannel.appendLine(`Parsed ${iconData.length} icons from "${fullPath}"`);

        iconCache.set(fullPath, iconData);
        return iconData;
    } catch (error) {
        const message = `Error reading icon file: ${error}`;
        outputChannel.appendLine(message);
        vscode.window.showErrorMessage(message);
        return [];
    }
}

function parseIconData(svgContent: string): IconData[] {
    const iconData: IconData[] = [];

    // Match complete <symbol>...</symbol> elements
    const symbolPattern = /<symbol[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/symbol>/g;
    let match;

    while ((match = symbolPattern.exec(svgContent)) !== null) {
        const id = match[1];
        const symbolElement = match[0]; // Full <symbol>...</symbol> tag
        iconData.push({ id, symbolElement });
    }

    return iconData;
}

function createIconDataUri(symbolElement: string): vscode.Uri {
    // Extract viewBox from the symbol element
    const viewBoxMatch = symbolElement.match(/viewBox=["']([^"']+)["']/);
    const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 24 24';

    // Extract the inner content of the symbol (everything between <symbol> and </symbol>)
    const contentMatch = symbolElement.match(/<symbol[^>]*>([\s\S]*?)<\/symbol>/);
    const content = contentMatch ? contentMatch[1] : '';

    // Determine stroke color based on theme
    const isDarkTheme =
        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    const fillColor = isDarkTheme ? '#ffffff' : '';

    // Create a complete standalone SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="24" height="24" fill="${fillColor}">${content}</svg>`;

    // Create a data URI
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return vscode.Uri.parse(dataUri);
}

export function deactivate() {
    iconCache.clear();
}
