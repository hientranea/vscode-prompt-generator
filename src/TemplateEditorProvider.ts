import * as vscode from "vscode";
import * as path from "path";

export class TemplateEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new TemplateEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      TemplateEditorProvider.viewType,
      provider
    );
    return providerRegistration;
  }

  private static readonly viewType = "fileConcatenator.templateEditor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    function updateWebview(): void {
      const config = vscode.workspace.getConfiguration("fileConcatenator").get("templatesAndRules");
      webviewPanel.webview.postMessage({
        type: "update",
        data: config,
      });
    }

    const configurationChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("fileConcatenator.templatesAndRules")) {
        updateWebview();
      }
    });

    webviewPanel.onDidDispose(() => {
      configurationChangeListener.dispose();
    });

    webviewPanel.webview.onDidReceiveMessage(async (e) => {
      switch (e.type) {
        case "update":
          await vscode.workspace
            .getConfiguration("fileConcatenator")
            .update("templatesAndRules", e.data, vscode.ConfigurationTarget.Global);
          updateWebview();
          return;
        case "getData":
          updateWebview();
          return;
      }
    });

    updateWebview();
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "media", "templateEditor.js"))
    );

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Prompt Templates and Ignore Rules</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 20px; 
                        padding-top: 60px;
                    }
                    h2 { margin-top: 20px; }
                    ul { list-style-type: none; padding: 0; }
                    li { margin-bottom: 10px; }
                    input, textarea { width: 100%; margin-bottom: 5px; }
                    button { margin-right: 5px; }
                    #header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background-color: var(--vscode-editor-background);
                        padding: 10px;
                        z-index: 1000;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    }
                    #save-button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        font-size: 14px;
                        font-weight: bold;
                        cursor: pointer;
                        transition: background-color 0.3s;
                    }
                    #save-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    #save-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }
                </style>
            </head>
            <body>
                <div id="header">
                    <h1>Prompt Templates and Ignore Rules</h1>
                    <button id="save-button" onclick="saveChanges()" disabled>Save Changes</button>
                </div>
                <h2>Templates</h2>
                <ul id="template-list"></ul>
                <button id="add-template">Add Template</button>
                <h2>Additional Ignore Rules</h2>
                <ul id="ignore-rule-list"></ul>
                <button id="add-ignore-rule">Add Ignore Rule</button>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
  }
}
