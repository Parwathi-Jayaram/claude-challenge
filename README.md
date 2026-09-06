[![progress-banner](https://backend.codecrafters.io/progress/claude-code/e9ecbbe2-098e-4bce-be66-bdca9761f7e2)](https://app.codecrafters.io/users/Parwathi-Jayaram?r=2qF)
# Claude Code Clone

A VS Code extension that brings an AI-powered coding assistant directly into your editor. It uses LLMs to understand code and perform actions through tool calls, just like Claude Code.

## Features

- Chat interface in the VS Code sidebar
- Reads and writes files in your workspace
- Executes shell commands via integrated terminal
- Supports multiple LLM providers: Groq, OpenRouter, and OpenAI
- Configurable API key and model selection through VS Code settings

## Setup

1. Install the extension from the VS Code Marketplace
2. Open Settings (`Ctrl+,`) and search for **"Claude Code"**
3. Set your API key under **Claude Code: Api Key**
4. Choose your provider under **Claude Code: Provider** (`groq`, `openrouter`, or `openai`)

## Usage

1. Click the **Claude Code** icon in the activity bar to open the chat panel
2. Type a prompt and press **Send**
3. The assistant can read files, write files, and run commands in your workspace

## Example Prompts

- `read app/main.py`
- `write a hello world python script`
- `run npm install`

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `claudeCode.apiKey` | Your API key for the selected provider | `""` |
| `claudeCode.provider` | LLM provider to use | `groq` |

## Development

```sh
cd vscode
npm install
npm run compile
```

Press `F5` to launch the Extension Development Host and test the extension.

## License

MIT

