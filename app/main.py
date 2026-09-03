import argparse
import os
import json
import subprocess
from openai import OpenAI

API_KEY = os.getenv("OPENROUTER_API_KEY")
BASE_URL = os.getenv(
    "OPENROUTER_BASE_URL",
    "https://openrouter.ai/api/v1"
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", required=True)
    args = parser.parse_args()

    if not API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    client = OpenAI(
        api_key=API_KEY,
        base_url=BASE_URL
    )

    messages = [
        {
            "role": "user",
            "content": args.p
        }
    ]

    tools = [
        {
            "type": "function",
            "function": {
                "name": "Read",
                "description": "Read and return the content of a file",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "The path to the file to read"
                        }
                    },
                    "required": ["file_path"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "Write",
                "description": "Write content to a file",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "The path of the file to write to"
                        },
                        "content": {
                            "type": "string",
                            "description": "The content to write to the file"
                        }
                    },
                    "required": ["file_path", "content"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "Bash",
                "description": "Execute a shell command",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "The command to execute"
                        }
                    },
                    "required": ["command"]
                }
            }
        }
    ]

    while True:

        chat = client.chat.completions.create(
            model="anthropic/claude-haiku-4.5",
            messages=messages,
            tools=tools
        )

        if not chat.choices:
            raise RuntimeError("No choices in response")

        message = chat.choices[0].message

        messages.append(message.model_dump())

        if not message.tool_calls:
            print(message.content, end="")
            break

        for tool_call in message.tool_calls:

            tool_name = tool_call.function.name
            tool_args = json.loads(
                tool_call.function.arguments
            )

            try:

                if tool_name == "Read":

                    file_path = tool_args["file_path"]

                    with open(file_path, "r") as f:
                        result = f.read()

                elif tool_name == "Write":

                    file_path = tool_args["file_path"]
                    content = tool_args["content"]

                    with open(file_path, "w") as f:
                        f.write(content)

                    result = "File written successfully"

                elif tool_name == "Bash":

                    command = tool_args["command"]

                    completed = subprocess.run(
                        command,
                        shell=True,
                        capture_output=True,
                        text=True
                    )

                    result = (
                        completed.stdout +
                        completed.stderr
                    )

                else:
                    result = (
                        f"Unknown tool: {tool_name}"
                    )

            except Exception as e:
                result = f"Error: {str(e)}"

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result
                }
            )


if __name__ == "__main__":
    main()