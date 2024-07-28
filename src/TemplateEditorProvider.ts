import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export class TemplateEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new TemplateEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      TemplateEditorProvider.viewType,
      provider
    );
    return providerRegistration;
  }

  private static readonly viewType = "promptGenerator.templateEditor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, "media"))],
    };
    webviewPanel.webview.html = await this.getHtmlForWebview(webviewPanel.webview);

    function updateWebview(): void {
      const config = vscode.workspace.getConfiguration("promptGenerator").get("settings");
      webviewPanel.webview.postMessage({
        type: "update",
        data: config,
      });
    }

    const configurationChangeListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("promptGenerator.settings")) {
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
            .getConfiguration("promptGenerator")
            .update("settings", e.data, vscode.ConfigurationTarget.Global);
          updateWebview();
          return;
        case "getData":
          updateWebview();
          return;
      }
    });

    updateWebview();
  }

  private async getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    const htmlPath = path.join(this.context.extensionPath, "media", "templateEditor.html");
    let htmlContent = await fs.promises.readFile(htmlPath, "utf-8");

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "media", "templateEditor.js"))
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, "media", "styles.css"))
    );

    htmlContent = htmlContent
      .replace("${scriptUri}", scriptUri.toString())
      .replace("${styleUri}", styleUri.toString());

    return htmlContent;
  }
}
