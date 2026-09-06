import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

export async function handleRead(args: { file_path: string }): Promise<string> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  const absolutePath = path.isAbsolute(args.file_path)
    ? args.file_path
    : path.join(workspaceRoot || "", args.file_path);

  try {
    const content = await fs.readFile(absolutePath, "utf-8");
    return content;
  } catch (e) {
    return `Error: ${(e as Error).message}`;
  }
}

export async function handleWrite(args: { file_path: string; content: string }): Promise<string> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  const absolutePath = path.isAbsolute(args.file_path)
    ? args.file_path
    : path.join(workspaceRoot || "", args.file_path);

  try {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, args.content);
    return "File written successfully";
  } catch (e) {
    return `Error: ${(e as Error).message}`;
  }
}

export async function handleBash(args: { command: string }): Promise<string> {
  const terminal = vscode.window.createTerminal({
    name: "Claude Code",
    shellPath: args.command
  });
  terminal.show();

  return `Running: ${args.command}`;
}
