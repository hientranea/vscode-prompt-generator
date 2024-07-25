import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import ignore from 'ignore';
import { TemplateEditorProvider } from './TemplateEditorProvider';

interface Template {
    name: string;
    template: string;
}

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('prompt-generator.generate', async () => {
        // Add status bar item
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = "$(sparkle) Prompt Generator";
        statusBarItem.tooltip = `Generate Prompt (${os.platform() === 'darwin' ? 'cmd+M' : 'cmd+M'})`;
        statusBarItem.command = 'prompt-generator.generate';
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        // Create a QuickPick for file selection
        const quickPick = vscode.window.createQuickPick();
        quickPick.canSelectMany = true;
        quickPick.title = 'Select files to concatenate';

        // Get all files in the workspace, respecting .gitignore
        const files = await getAllFiles(workspaceFolder.uri.fsPath);
        
        // Create QuickPickItems for each file
        quickPick.items = files.map(file => ({
            label: vscode.workspace.asRelativePath(file),
            description: path.basename(file),
        }));

        // Show the QuickPick and wait for user selection
        quickPick.show();
        const selection = await new Promise<readonly vscode.QuickPickItem[]>(resolve => {
            quickPick.onDidAccept(() => resolve(quickPick.selectedItems));
        });
        quickPick.dispose();

        if (selection.length === 0) {
            vscode.window.showInformationMessage('No files selected');
            return;
        }

        // Get templates from configuration
        const config = vscode.workspace.getConfiguration('fileConcatenator');
        const templatesAndRules = config.get('templatesAndRules') as { templates: Template[] };
        const templates: Template[] = templatesAndRules.templates || [];

        // Create QuickPick for template selection
        const templateQuickPick = vscode.window.createQuickPick();
        templateQuickPick.items = templates.map(t => ({ label: t.name }));
        templateQuickPick.title = 'Select a template';

        // Show the QuickPick and wait for user selection
        templateQuickPick.show();
        const selectedTemplate = await new Promise<vscode.QuickPickItem | undefined>(resolve => {
            templateQuickPick.onDidAccept(() => resolve(templateQuickPick.selectedItems[0]));
        });
        templateQuickPick.dispose();

        if (!selectedTemplate) {
            vscode.window.showInformationMessage('No template selected');
            return;
        }

        const template = templates.find(t => t.name === selectedTemplate.label)?.template || '';

        // Read file contents and wrap them
        const wrappedContents = await Promise.all(selection.map(async item => {
            const filePath = path.join(workspaceFolder.uri.fsPath, item.label);
            const content = await readFile(filePath);
            const fileName = path.basename(filePath);
            return `>>>>>>>>>>>>>>> Starting contents of file ${fileName} >>>>>>>>>>>>>>>\n${content}\n<<<<<<<<<<<<<< End of contents of file ${fileName} <<<<<<<<<<<<<<\n`;
        }));

        // Combine wrapped contents
        const combinedWrappedContent = wrappedContents.join('\n');

        // Apply the main template
        const finalContent = template.replace('{content}', combinedWrappedContent);

        // Create new document with combined content
        const document = await vscode.workspace.openTextDocument({
            content: finalContent,
            language: 'plaintext'
        });

        vscode.window.showTextDocument(document);
    });

    context.subscriptions.push(disposable);
	context.subscriptions.push(TemplateEditorProvider.register(context));
	context.subscriptions.push(
		vscode.commands.registerCommand('fileConcatenator.editTemplates', () => {
			const workspaceEdit = new vscode.WorkspaceEdit();
			const filePath = vscode.Uri.parse('untitled:fileConcatenator.templates.json');
			workspaceEdit.createFile(filePath, { ignoreIfExists: true });
			vscode.workspace.applyEdit(workspaceEdit).then(() => {
				vscode.commands.executeCommand('vscode.openWith', filePath, 'fileConcatenator.templateEditor');
			});
		})
	);
	

}

async function getAllFiles(workspaceRoot: string): Promise<string[]> {
    const ignorePatterns = await getIgnoredPatterns(workspaceRoot);
    const ig = ignore().add(ignorePatterns);

    // Use vscode.workspace.findFiles to get all files, respecting files.exclude
    const files = await vscode.workspace.findFiles('**/*', null);

    return files
        .map(file => file.fsPath)
        .filter(filePath => {
            const relativePath = path.relative(workspaceRoot, filePath);
            return !ig.ignores(relativePath);
        });
}

async function getIgnoredPatterns(workspaceRoot: string): Promise<string[]> {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    let gitignoreContent = '';
    try {
        gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf-8');
    } catch (error) {
        // .gitignore doesn't exist, which is fine
    }

    const config = vscode.workspace.getConfiguration('fileConcatenator');
    const templatesAndRules = config.get('templatesAndRules') as { additionalIgnoreRules: string[] };
    const additionalRules: string[] = templatesAndRules.additionalIgnoreRules || [];

    return gitignoreContent.split('\n')
        .concat(additionalRules)
        .filter(line => line.trim() !== '' && !line.startsWith('#'));
}

async function readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
}

export function deactivate() {}
