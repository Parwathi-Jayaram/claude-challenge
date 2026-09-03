import argparse
import os
import json
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
                            "description": "Path of file to read"
                        }
                    },
                    "required": ["file_path"]
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

            tool_args = json.loads(
                tool_call.function.arguments
            )

            file_path = tool_args["file_path"]

            with open(file_path, "r") as f:
                result = f.read()

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result
                }
            )


if __name__ == "__main__":
    main()