"""Mock E2B sandbox to avoid rate limits during development"""
import os
import json
from dotenv import load_dotenv
from pathlib import Path

# Load env from project root
_project_root = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=_project_root / "env")
load_dotenv(dotenv_path=_project_root / ".env")

class MockExecution:
    def __init__(self, stdout="", stderr="", exit_code=0):
        self.stdout = stdout
        self.stderr = stderr
        self.exit_code = exit_code

class MockSandbox:
    """Temporary mock sandbox that returns predefined outputs instead of executing code"""
    def __init__(self, *args, **kwargs):
        print("[MockSandbox] Initialized - Using mock responses")
        
    def files(self):
        return self
        
    def write(self, filename, content):
        print(f"[MockSandbox] Would write to {filename}:")
        print(content)
        return True
        
    def commands(self):
        return self
        
    def run(self, cmd):
        print(f"[MockSandbox] Would run: {cmd}")
        
        # Extract the validation function call
        if "const result = evaluate(" in cmd:
            try:
                # Parse the test input from the JavaScript code
                test_input_start = cmd.find("const testInput = ") + len("const testInput = ")
                test_input_end = cmd.find(";", test_input_start)
                test_input_json = cmd[test_input_start:test_input_end].strip()
                test_input = json.loads(test_input_json)
                
                # Mock validation logic for logical problems
                if "submission" in test_input:
                    submission = test_input["submission"]
                    
                    # For our specific test case - checking if value at key 1 is 23
                    if isinstance(submission, dict) and 1 in submission:
                        value = submission[1]
                        is_correct = value == 23  # The expected answer
                        
                        result = {
                            "is_correct": is_correct,
                            "condition_level_is_correct": [is_correct],
                            "feedback": "Correct! The answer is 23." if is_correct else f"Not quite. Your answer was {value}, but that's not correct.",
                            "confidence_score": 0.9 if is_correct else 0.0
                        }
                        return MockExecution(stdout=json.dumps(result))
                
                # Default response for unhandled cases
                return MockExecution(stdout=json.dumps({
                    "is_correct": False,
                    "condition_level_is_correct": [False],
                    "feedback": "Please check your answer format and try again.",
                    "confidence_score": 0.0
                }))
                    
            except Exception as e:
                print(f"[MockSandbox] Error parsing validation input: {e}")
                return MockExecution(stdout=json.dumps({
                    "is_correct": False,
                    "condition_level_is_correct": [False],
                    "error": str(e),
                    "execution_failed": True
                }))
                
        return MockExecution(
            stdout=json.dumps({
                "is_correct": False,
                "condition_level_is_correct": [False],
                "feedback": "Could not validate submission",
                "confidence_score": 0.0
            })
        )

# Export mock sandbox instance
sandbox = MockSandbox()