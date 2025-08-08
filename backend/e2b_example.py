
import os
from dotenv import load_dotenv
from openai import OpenAI
from e2b import Sandbox

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
E2B_API_KEY = os.getenv("E2B_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY is not set. Create a .env with OPENAI_API_KEY=... or export it in your shell."
    )
if not E2B_API_KEY:
    raise RuntimeError(
        "E2B_API_KEY is not set. Create a .env with E2B_API_KEY=... or export it in your shell. See https://e2b.dev/docs/api-key"
    )

try:
    
    code='function calculateAnswer() { return 14 * 23; } console.log(calculateAnswer());'
    print("second code")
    print(code)
    if code and any(js_hint in code for js_hint in ["console.log", "function", "const ", "let ", "var ", "=>"]):

        try:
            with Sandbox(template="base", api_key=E2B_API_KEY) as sandbox:
                sandbox.files.write("script.js", code)
                execution = sandbox.commands.run("node script.js")
                result = execution.stdout if execution.exit_code == 0 else execution.stderr
                if not result or not result.strip():
                    result = "(no output) Ensure your JavaScript prints with console.log(...)"
        except Exception as e:

            error_text = str(e)
            if "401" in error_text or "Invalid API key" in error_text:
                raise RuntimeError(
                    "E2B authentication failed (401). Your E2B_API_KEY is invalid or expired. "
                    "Generate a new key at https://e2b.dev/docs/api-key and update your .env"
                ) from e
            raise
        print("--- JavaScript Execution Result ---")
        print(result)
    else:
        print("Skipping execution because the generated code does not look like Python or JavaScript.")
except Exception as e:
    print(f"An error occurred: {e}")
# e2b.deve2b.dev
# E2B - Code Interpreting for AI apps
# Open-source secure sandboxes for AI code execution
# 6:11
# e2b_5e156895395ad584053eb469b5a39b6425e6bcfe
# 6:11
# E2B_API_KEY=e2b_5e156895395ad584053eb469b5a39b6425e6bcfe














