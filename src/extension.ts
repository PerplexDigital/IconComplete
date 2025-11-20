import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const iconCache: Map<string, IconData[]> = new Map();
let outputChannel: vscode.OutputChannel;

interface IconQuickPickItem extends vscode.QuickPickItem {
    iconId: string;
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

    // Get icon data (IDs and symbols)
    const iconData = await getIconData(svgPath);

    if (!iconData || iconData.length === 0) {
        outputChannel.appendLine('No icon IDs found');
        vscode.window.showWarningMessage('No icons found in SVG file');
        return;
    }

    outputChannel.appendLine(`Found ${iconData.length} icons`);

    // Create QuickPick
    const quickPick = vscode.window.createQuickPick<IconQuickPickItem>();
    quickPick.placeholder = 'Search for an icon...';
    quickPick.matchOnDetail = true;
    quickPick.matchOnDescription = false;

    // Create items with icon previews
    quickPick.items = iconData.map(({ id, symbolElement }) => ({
        label: id,
        alwaysShow: false,
        iconId: id,
        iconPath: symbolElement ? createIconDataUri(symbolElement) : undefined,
    }));

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

async function getIconData(svgPathInHref: string): Promise<IconData[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        outputChannel.appendLine('No workspace folder found');
        return [];
    }

    // Resolve the SVG path - it could be relative to workspace or use a configured path
    let fullPath: string;

    // If the path starts with /, it's relative to the workspace root
    // In Vite, paths like /icons/icons.svg actually map to /public/icons/icons.svg
    if (svgPathInHref.startsWith('/')) {
        // Try public folder first (Vite convention)
        const publicPath = path.join(workspaceFolder.uri.fsPath, 'public', svgPathInHref);
        if (fs.existsSync(publicPath)) {
            fullPath = publicPath;
            outputChannel.appendLine(`Found in public folder: "${fullPath}"`);
        } else {
            // Fall back to workspace root
            fullPath = path.join(workspaceFolder.uri.fsPath, svgPathInHref);
            outputChannel.appendLine(`Using workspace root: "${fullPath}"`);
        }
    } else {
        // Otherwise, use the configured path
        const config = vscode.workspace.getConfiguration('iconComplete');
        const iconFilePath = config.get<string>('iconFilePath', 'public/icons/icons.svg');
        fullPath = path.join(workspaceFolder.uri.fsPath, iconFilePath);
        outputChannel.appendLine(`Using configured path: "${fullPath}"`);
    }

    outputChannel.appendLine(`Resolved full path: "${fullPath}"`);

    // Check cache
    if (iconCache.has(fullPath)) {
        outputChannel.appendLine('Using cached icon data');
        return iconCache.get(fullPath)!;
    }

    // Read and parse SVG file
    try {
        if (!fs.existsSync(fullPath)) {
            const message = `Icon file not found: ${fullPath}`;
            outputChannel.appendLine(message);
            vscode.window.showWarningMessage(message);
            return [];
        }

        const svgContent = fs.readFileSync(fullPath, 'utf-8');
        const iconData = parseIconData(svgContent);

        outputChannel.appendLine(`Parsed ${iconData.length} icons from SVG`);

        // Cache the results
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
    const strokeColor = isDarkTheme ? '#ffffff' : '#000000';

    // Create a complete standalone SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="16" height="16" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;

    // Create a data URI
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return vscode.Uri.parse(dataUri);
}

export function deactivate() {
    iconCache.clear();
}
