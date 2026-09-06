import OpenAI from "openai";
import * as vscode from "vscode";

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

function getApiKey(): string {
  const config = vscode.workspace.getConfiguration("claudeCode");
  return config.get<string>("apiKey", "");
}

function getProvider(): string {
  const config = vscode.workspace.getConfiguration("claudeCode");
  return config.get<string>("provider", "groq");
}

export async function runAgentLoop(
  prompt: string,
  onToolCall: (tool: ToolCall) => Promise<string>,
  onMessage: (text: string) => void
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing API key. Set claudeCode.apiKey in settings.");
  }

  const provider = getProvider();
  let baseURL: string;
  let model: string;

  if (provider === "groq") {
    baseURL = "https://api.groq.com/openai/v1";
    model = "llama-3.3-70b-versatile";
  } else if (provider === "openrouter") {
    baseURL = "https://openrouter.ai/api/v1";
    model = "anthropic/claude-haiku-4.5";
  } else {
    baseURL = provider;
    model = "gpt-3.5-turbo";
  }

  const client = new OpenAI({ apiKey, baseURL });

  const messages: any[] = [
    { role: "user", content: prompt }
  ];

  const tools = [
    {
      type: "function" as const,
      function: {
        name: "Read",
        description: "Read and return the content of a file",
        parameters: {
          type: "object",
          properties: {
            file_path: { type: "string" }
          },
          required: ["file_path"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "Write",
        description: "Write content to a file",
        parameters: {
          type: "object",
          properties: {
            file_path: { type: "string" },
            content: { type: "string" }
          },
          required: ["file_path", "content"]
        }
      }
    },
    {
      type: "function" as const,
      function: {
        name: "Bash",
        description: "Execute a shell command",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string" }
          },
          required: ["command"]
        }
      }
    }
  ];

  while (true) {
    const chat = await client.chat.completions.create({
      model,
      messages,
      tools,
      max_tokens: 4096
    });

    if (!chat.choices) throw new Error("No choices in response");

    const message = chat.choices[0].message;
    messages.push(message as any);

    if (!message.tool_calls) {
      if (message.content) onMessage(message.content);
      break;
    }

    for (const toolCall of message.tool_calls) {
      const args = JSON.parse((toolCall as any).function.arguments);
      const result = await onToolCall({
        name: (toolCall as any).function.name,
        arguments: args
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result
      });
    }
  }
}
