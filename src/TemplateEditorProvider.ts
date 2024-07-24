import * as vscode from 'vscode';
import * as path from 'path';

export class TemplateEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new TemplateEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(TemplateEditorProvider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'fileConcatenator.templateEditor';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        function updateWebview() {
            const templates = vscode.workspace.getConfiguration('fileConcatenator').get('templates');
            webviewPanel.webview.postMessage({
                type: 'update',
                templates: templates
            });
        }

        // Listen for configuration changes
        const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('fileConcatenator.templates')) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            configurationChangeListener.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async e => {
            switch (e.type) {
                case 'update':
                    await vscode.workspace.getConfiguration('fileConcatenator').update('templates', e.templates, vscode.ConfigurationTarget.Global);
                    updateWebview(); // Immediately update the webview after changing the configuration
                    return;
                case 'getTemplates':
                    updateWebview();
                    return;
            }
        });

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this.context.extensionPath, 'media', 'templateEditor.js')
        ));

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prompt Templates</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; }
                    ul { list-style-type: none; padding: 0; }
                    li { margin-bottom: 10px; }
                    input, textarea { width: 100%; margin-bottom: 5px; }
                    button { margin-right: 5px; }
                </style>
            </head>
            <body>
                <h1>Prompt Templates</h1>
                <ul id="template-list"></ul>
                <button id="add-template">Add Template</button>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}
