import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import { TemplateEditorProvider } from "./TemplateEditorProvider";
import { FileExplorer, FileItem } from "./FileExplorer";

interface Template {
  name: string;
  template: string;
}

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : undefined;

  const fileExplorer = new FileExplorer(workspaceRoot);
  vscode.window.registerTreeDataProvider("fileExplorer", fileExplorer);

  const generatePromptCommand = vscode.commands.registerCommand("prompt-generator.generate", () =>
    generatePrompt(fileExplorer)
  );
  const toggleSelectionCommand = vscode.commands.registerCommand(
    "fileExplorer.toggleSelection",
    (item: FileItem) => {
      fileExplorer.toggleSelection(item);
    }
  );

  context.subscriptions.push(generatePromptCommand);
  context.subscriptions.push(toggleSelectionCommand);
  context.subscriptions.push(TemplateEditorProvider.register(context));
  context.subscriptions.push(
    vscode.commands.registerCommand("prompt-generator.settings", openTemplateEditor)
  );
  context.subscriptions.push(fileExplorer);
}

async function generatePrompt(fileExplorer: FileExplorer): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "No workspace folder is open. Please open a project folder to use this extension."
    );
    return;
  }

  const selectedItems = fileExplorer.getSelectedItems();
  if (selectedItems.length === 0) {
    vscode.window.showInformationMessage(
      "No files were selected. Please choose at least one file to generate the prompt."
    );
    return;
  }

  const selectedTemplate = await selectTemplate();
  if (!selectedTemplate) {
    vscode.window.showInformationMessage(
      "No template was selected. Please choose a template to generate the prompt."
    );
    return;
  }

  const wrappedContents = await getWrappedContents(workspaceFolder, selectedItems);
  const combinedWrappedContent = wrappedContents.join("\n");
  const finalContent = selectedTemplate.template.replace("{content}", combinedWrappedContent);

  const document = await vscode.workspace.openTextDocument({
    content: finalContent,
    language: "plaintext",
  });

  vscode.window.showTextDocument(document);
}

async function selectTemplate(): Promise<Template | undefined> {
  const config = vscode.workspace.getConfiguration("promptGenerator");
  const settings = config.get("settings") as {
    templates: Template[];
  };
  const templates: Template[] = settings.templates || [];

  const templateQuickPick = vscode.window.createQuickPick();
  templateQuickPick.items = templates.map((t) => ({ label: t.name }));
  templateQuickPick.title = "Select a template";

  templateQuickPick.show();
  const selectedTemplate = await new Promise<vscode.QuickPickItem | undefined>((resolve) => {
    templateQuickPick.onDidAccept(() => resolve(templateQuickPick.selectedItems[0]));
  });
  templateQuickPick.dispose();

  return templates.find((t) => t.name === selectedTemplate?.label);
}

async function getWrappedContents(
  workspaceFolder: vscode.WorkspaceFolder,
  selectedItems: string[]
): Promise<string[]> {
  const wrappedContents: string[] = [];

  for (const itemPath of selectedItems) {
    const relativePath = vscode.workspace.asRelativePath(itemPath);
    const stat = await fs.promises.stat(itemPath);

    if (stat.isDirectory()) {
      wrappedContents.push(`>>>>>>>>>>>>>>> Directory: ${relativePath} >>>>>>>>>>>>>>>`);
      const subItems = await fs.promises.readdir(itemPath);
      const subItemPaths = subItems.map((subItem) => path.join(itemPath, subItem));
      const subContents = await getWrappedContents(workspaceFolder, subItemPaths);
      wrappedContents.push(...subContents);
      wrappedContents.push(`<<<<<<<<<<<<<< End of directory: ${relativePath} <<<<<<<<<<<<<<`);
    } else {
      const content = await readFile(itemPath);
      wrappedContents.push(
        `>>>>>>>>>>>>>>> Starting contents of file ${relativePath} >>>>>>>>>>>>>>>`
      );
      wrappedContents.push(content);
      wrappedContents.push(`<<<<<<<<<<<<<< End of contents of file ${relativePath} <<<<<<<<<<<<<<`);
    }
  }

  return wrappedContents;
}

async function readFile(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, "utf-8");
}

function openTemplateEditor(): void {
  const workspaceEdit = new vscode.WorkspaceEdit();
  const filePath = vscode.Uri.parse("untitled:promptGenerator.templates.json");
  workspaceEdit.createFile(filePath, { ignoreIfExists: true });
  vscode.workspace.applyEdit(workspaceEdit).then(() => {
    vscode.commands.executeCommand("vscode.openWith", filePath, "promptGenerator.templateEditor");
  });
}

export function deactivate(): void {}
