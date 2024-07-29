import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import ignore, { Ignore } from "ignore";

export class FileItem extends vscode.TreeItem {
  constructor(
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public isSelected: boolean = false
  ) {
    super(resourceUri, collapsibleState);
    this.contextValue = isSelected ? "selected" : "unselected";
    this.label = path.basename(resourceUri.fsPath);
    this.updateDescription();
  }

  updateDescription(): void {
    this.description = this.isSelected ? "(Selected)" : "";
  }
}

export class FileExplorer implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> =
    new vscode.EventEmitter<FileItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private selectedItems: Set<string> = new Set();
  private watcher: vscode.FileSystemWatcher | undefined;
  private ignoreRules: string[] = [];
  private ig: Ignore | undefined;

  constructor(private workspaceRoot: string | undefined) {
    this.setupFileWatcher();
    this.loadIgnoreRules();
  }

  private async loadIgnoreRules(): Promise<void> {
    if (this.workspaceRoot) {
      try {
        this.ignoreRules = await getIgnoredPatterns(this.workspaceRoot);
        this.ig = ignore().add(this.ignoreRules);
        this.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Error loading ignore rules: ${error}`);
        this.ig = ignore();
      }
    } else {
      this.ig = ignore();
    }
  }

  private setupFileWatcher(): void {
    if (this.workspaceRoot) {
      this.watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(this.workspaceRoot, "**/*")
      );

      this.watcher.onDidCreate(() => this.refresh());
      this.watcher.onDidDelete(() => this.refresh());
      this.watcher.onDidChange(() => this.refresh());
    }
  }

  private isIgnored(filePath: string): boolean {
    if (!this.workspaceRoot || !this.ig) {
      return false;
    }
    const relativePath = path.relative(this.workspaceRoot, filePath);
    return this.ig.ignores(relativePath);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileItem): Thenable<FileItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No folder opened");
      return Promise.resolve([]);
    }

    if (element) {
      return this.getFileItems(element.resourceUri.fsPath);
    } else {
      return this.getFileItems(this.workspaceRoot);
    }
  }

  private async getFileItems(folderPath: string): Promise<FileItem[]> {
    const files = await fs.promises.readdir(folderPath);
    const fileItems = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(folderPath, file);

        if (this.isIgnored(filePath)) {
          return null;
        }

        const stat = await fs.promises.stat(filePath);
        const collapsibleState = stat.isDirectory()
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None;
        return new FileItem(
          vscode.Uri.file(filePath),
          collapsibleState,
          this.selectedItems.has(filePath)
        );
      })
    );

    return fileItems
      .filter((item): item is FileItem => item !== null)
      .sort((a, b) => {
        if (a.collapsibleState === b.collapsibleState) {
          const labelA = this.getCompareLabel(a);
          const labelB = this.getCompareLabel(b);
          return labelA.localeCompare(labelB);
        }
        return a.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed ? -1 : 1;
      });
  }

  private getCompareLabel(item: FileItem): string {
    if (typeof item.label === "string") {
      return item.label;
    } else if (item.label) {
      return item.label.label;
    }
    return path.basename(item.resourceUri.fsPath);
  }

  async toggleSelection(item: FileItem): Promise<void> {
    const itemPath = item.resourceUri.fsPath;
    if (this.selectedItems.has(itemPath)) {
      await this.deselectRecursively(itemPath);
    } else {
      await this.selectRecursively(itemPath);
    }
    this._onDidChangeTreeData.fire();
  }

  private async selectRecursively(itemPath: string): Promise<void> {
    this.selectedItems.add(itemPath);
    const stat = await fs.promises.stat(itemPath);
    if (stat.isDirectory()) {
      const files = await fs.promises.readdir(itemPath);
      for (const file of files) {
        const filePath = path.join(itemPath, file);
        if (!this.isIgnored(filePath)) {
          await this.selectRecursively(filePath);
        }
      }
    }
  }

  private async deselectRecursively(itemPath: string): Promise<void> {
    this.selectedItems.delete(itemPath);
    const stat = await fs.promises.stat(itemPath);
    if (stat.isDirectory()) {
      const files = await fs.promises.readdir(itemPath);
      for (const file of files) {
        const filePath = path.join(itemPath, file);
        if (!this.isIgnored(filePath)) {
          await this.deselectRecursively(filePath);
        }
      }
    }
  }

  getSelectedItems(): string[] {
    return Array.from(this.selectedItems);
  }

  dispose() {
    if (this.watcher) {
      this.watcher.dispose();
    }
  }
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
