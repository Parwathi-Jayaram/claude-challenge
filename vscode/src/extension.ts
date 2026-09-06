import * as vscode from "vscode";
import { runAgentLoop, ToolCall } from "./llmService";
import { handleRead, handleWrite, handleBash } from "./tools";

class ChatProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this._getHtml();

    webviewView.webview.onDidReceiveMessage(async (data) => {
      if (data.type === "ask") {
        await this.handleUserPrompt(data.value);
      }
    });
  }

  private async handleUserPrompt(prompt: string) {
    this._view?.webview.postMessage({ type: "status", value: "thinking..." });

    try {
      await runAgentLoop(prompt, async (tool: ToolCall) => {
        let result: string;

        if (tool.name === "Read") {
          result = await handleRead(tool.arguments as { file_path: string });
        } else if (tool.name === "Write") {
          result = await handleWrite(tool.arguments as { file_path: string; content: string });
        } else if (tool.name === "Bash") {
          result = await handleBash(tool.arguments as { command: string });
        } else {
          result = `Unknown tool: ${tool.name}`;
        }

        this._view?.webview.postMessage({
          type: "tool",
          value: tool.name,
          args: tool.arguments,
          result
        });

        return result;
      }, (text: string) => {
        this._view?.webview.postMessage({ type: "stream", value: text });
      });
    } catch (e) {
      this._view?.webview.postMessage({
        type: "error",
        value: (e as Error).message
      });
    }
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 10px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    #chat-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    #messages {
      flex: 1;
      overflow-y: auto;
      margin-bottom: 10px;
    }
    .message {
      margin-bottom: 10px;
      padding: 8px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px;
    }
    .user-message {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    .tool-call {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding: 5px;
      margin: 5px 0;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }
    #input-container {
      display: flex;
      gap: 5px;
    }
    #prompt-input {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 8px;
      border-radius: 4px;
    }
    #send-button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="chat-container">
    <div id="messages"></div>
    <div id="input-container">
      <input id="prompt-input" type="text" placeholder="Ask Claude Code..." />
      <button id="send-button">Send</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const messagesDiv = document.getElementById("messages");
    const input = document.getElementById("prompt-input");
    const button = document.getElementById("send-button");

    function addMessage(text, type = "assistant") {
      const msg = document.createElement("div");
      msg.className = "message " + (type === "user" ? "user-message" : "");
      msg.textContent = text;
      messagesDiv.appendChild(msg);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function addToolCall(name, args, result) {
      const tool = document.createElement("div");
      tool.className = "tool-call";
      tool.innerHTML = "<strong>Tool: " + name + "</strong><br/>" +
                       "Args: " + JSON.stringify(args) + "<br/>" +
                       "Result: " + result;
      messagesDiv.appendChild(tool);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    button.addEventListener("click", () => {
      const text = input.value;
      if (text) {
        addMessage(text, "user");
        vscode.postMessage({ type: "ask", value: text });
        input.value = "";
      }
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") button.click();
    });

    window.addEventListener("message", (event) => {
      const data = event.data;
      if (data.type === "stream") {
        addMessage(data.value);
      } else if (data.type === "tool") {
        addToolCall(data.value, data.args, data.result);
      } else if (data.type === "error") {
        addMessage("Error: " + data.value);
      }
    });
  </script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("claudeCode.chatView", provider)
  );

  vscode.commands.registerCommand("claudeCode.ask", async () => {
    const prompt = await vscode.window.showInputBox({
      prompt: "Ask Claude Code"
    });
    if (prompt) {
      await provider["handleUserPrompt"](prompt);
    }
  });
}

export function deactivate() {}
