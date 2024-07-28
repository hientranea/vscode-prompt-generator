import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import ignore from "ignore";
import { TemplateEditorProvider } from "./TemplateEditorProvider";

interface Template {
  name: string;
  template: string;
}

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand("prompt-generator.generate", generatePrompt);

  context.subscriptions.push(disposable);
  context.subscriptions.push(TemplateEditorProvider.register(context));
  context.subscriptions.push(
    vscode.commands.registerCommand("prompt-generator.settings", openTemplateEditor)
  );
}

async function generatePrompt(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "No workspace folder is open. Please open a project folder to use this extension."
    );
    return;
  }

  const selectedFiles = await selectFiles(workspaceFolder);
  if (selectedFiles.length === 0) {
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

  const wrappedContents = await getWrappedContents(workspaceFolder, selectedFiles);
  const combinedWrappedContent = wrappedContents.join("\n");
  const finalContent = selectedTemplate.template.replace("{content}", combinedWrappedContent);

  const document = await vscode.workspace.openTextDocument({
    content: finalContent,
    language: "plaintext",
  });

  vscode.window.showTextDocument(document);
}

async function selectFiles(
  workspaceFolder: vscode.WorkspaceFolder
): Promise<vscode.QuickPickItem[]> {
  const quickPick = vscode.window.createQuickPick();
  quickPick.canSelectMany = true;
  quickPick.title = "Select files to concatenate";

  const files = await getAllFiles(workspaceFolder.uri.fsPath);
  quickPick.items = files.map((file) => ({
    label: vscode.workspace.asRelativePath(file),
    description: path.basename(file),
  }));

  quickPick.show();
  const selection = await new Promise<readonly vscode.QuickPickItem[]>((resolve) => {
    quickPick.onDidAccept(() => resolve(quickPick.selectedItems));
  });
  quickPick.dispose();

  return [...selection];
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
  selectedFiles: vscode.QuickPickItem[]
): Promise<string[]> {
  return Promise.all(
    selectedFiles.map(async (item) => {
      const filePath = path.join(workspaceFolder.uri.fsPath, item.label);
      const content = await readFile(filePath);
      const fileName = path.basename(filePath);
      return `>>>>>>>>>>>>>>> Starting contents of file ${fileName} >>>>>>>>>>>>>>>\n${content}\n<<<<<<<<<<<<<< End of contents of file ${fileName} <<<<<<<<<<<<<<\n`;
    })
  );
}

async function getAllFiles(workspaceRoot: string): Promise<string[]> {
  const ignorePatterns = await getIgnoredPatterns(workspaceRoot);
  const ig = ignore().add(ignorePatterns);

  const files = await vscode.workspace.findFiles("**/*", null);

  return files
    .map((file) => file.fsPath)
    .filter((filePath) => {
      const relativePath = path.relative(workspaceRoot, filePath);
      return !ig.ignores(relativePath);
    });
}

async function getIgnoredPatterns(workspaceRoot: string): Promise<string[]> {
  const gitignorePath = path.join(workspaceRoot, ".gitignore");
  let gitignoreContent = "";
  try {
    gitignoreContent = await fs.promises.readFile(gitignorePath, "utf-8");
  } catch (error) {
    // .gitignore doesn't exist, which is fine
  }

  const config = vscode.workspace.getConfiguration("promptGenerator");
  const settings = config.get("settings") as {
    additionalIgnoreRules: string[];
  };
  const additionalRules: string[] = settings.additionalIgnoreRules || [];

  return gitignoreContent
    .split("\n")
    .concat(additionalRules)
    .filter((line) => line.trim() !== "" && !line.startsWith("#"));
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
