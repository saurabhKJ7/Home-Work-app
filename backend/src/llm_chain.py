import os
import json 
import re
from typing import Dict, Any, List
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from dotenv import load_dotenv
from utils.logger import get_logger
from e2b import Sandbox
load_dotenv()
logger = get_logger("llm")

from pydantic import BaseModel, Field
from typing import List, Dict, Any

class TestCase(BaseModel):
    input: Dict[str, Any] = Field(description="Input parameters for the test case")
    expectedOutput: Any = Field(description="Expected output for this input")

class StructuredOutput(BaseModel):
    question: str = Field(description="The specific math problem to solve with concrete values")
    code: str = Field(description="Complete JavaScript function that solves this specific problem")
    inputExample: Dict[str, Any] = Field(description="Example input parameters as JSON object")
    expectedOutput: Any = Field(description="Expected output for the input example")
    validationTests: List[TestCase] = Field(description="Array of 10 test cases to verify correctness")
    feedbackHints: List[str] = Field(description="Exactly 10 short, hint-only feedback messages that do NOT reveal the answer")


LANGSMITH_TRACING="true"
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY=os.getenv("LANGSMITH_API_KEY")
LANGSMITH_PROJECT="Home-Work"
OPENAI_API_KEY=os.environ.get("OPENAI_API_KEY")

def init_anthropic_model():
    """Initialize Anthropic model"""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    
    if not api_key:
        raise ValueError("Anthropic API key must be set")
    
    return ChatAnthropic(
        model="claude-3-5-sonnet-20240620",
        anthropic_api_key=api_key,
        temperature=0.2
    )
def init_openai_model():
    """Initialize OpenAI model"""
    
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        raise ValueError("OpenAI API key must be set")
    
    return ChatOpenAI(
        model="gpt-4o",
        openai_api_key=api_key,)


def init_langsmith():
    """Initialize LangSmith for tracing"""
    api_key = os.environ.get("LANGSMITH_API_KEY")
    
    if not api_key:
        return None
    
    # LangSmith tracer optional; not used currently
    return None



from .sandbox import sandbox  # Import mock sandbox instance

def evaluate_code(code):
    import time 
    initial_time = time.time()
    try:
        sandbox.files.write("script.js", code)
        execution = sandbox.commands.run("node script.js")
        return execution.stdout or execution.stderr
    except Exception:
        logger.exception("evaluate_code: sandbox execution failed")
        raise
    finally:
        final_time = time.time()
        logger.info("evaluate_code execution_time_sec=%.2f", (final_time - initial_time))



from langchain.output_parsers import PydanticOutputParser

def run_validation_tests_in_sandbox(generated_code: str, validation_tests: List[TestCase]):
    """
    Execute the generated JavaScript function against provided validation tests
    inside the sandbox and return a structured summary.
    """
    # Try to detect function name and parameter names
    func_name = None
    param_names: List[str] = []
    try:
        # function foo(a,b) {...}
        m = re.findall(r"function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)", generated_code)
        if m:
            func_name, params_str = m[-1]
            if params_str.strip():
                param_names = [p.strip() for p in params_str.split(',') if p.strip()]
        else:
            # const foo = (a,b)=>{...}
            m2 = re.findall(r"const\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(([^)]*)\)\s*=>", generated_code)
            if m2:
                func_name, params_str = m2[-1]
                if params_str.strip():
                    param_names = [p.strip() for p in params_str.split(',') if p.strip()]
    except Exception:
        pass

    tests_json = json.dumps([t.dict() for t in validation_tests])
    param_names_json = json.dumps(param_names)
    export_line = f"globalThis.__solver__ = {func_name};" if func_name else ""
    harness = f"""
{generated_code}
{export_line}
const __PARAM_NAMES__ = {param_names_json};
const tests = {tests_json};
function tryRun(fn, input, paramNames) {{
  try {{
    let args;
    if (Array.isArray(paramNames) && paramNames.length > 1) {{
      args = paramNames.map(n => input?.[n]);
    }} else if (Array.isArray(paramNames) && paramNames.length === 1) {{
      args = [input];
    }} else {{
      if (input && typeof input === 'object' && 'a' in input && 'b' in input) {{
        args = [input.a, input.b];
      }} else {{
        args = [input];
      }}
    }}
    return {{ ok: true, value: fn(...args) }};
  }} catch (e) {{ return {{ ok: false, error: String(e) }}; }}
}}
function main() {{
  let solver = globalThis.__solver__;
  if (!solver) {{
    try {{
      const names = Object.keys(globalThis).filter(k => typeof globalThis[k] === 'function');
      solver = globalThis.calculateAnswer || globalThis.solve || globalThis.answer || (names.length ? globalThis[names[names.length-1]] : null);
    }} catch {{ solver = null; }}
  }}
  if (!solver) return {{ total: 0, passed: 0, results: [], error: 'Solver function not found' }};
  const results = tests.map((t, i) => {{
    const r = tryRun(solver, t.input, __PARAM_NAMES__);
    if (!r.ok) return {{ index: i, passed: false, error: r.error, expected: t.expectedOutput, input: t.input }};
    const actual = r.value;
    const passed = Number.isFinite(actual) && Number.isFinite(t.expectedOutput)
      ? Math.abs(actual - t.expectedOutput) < 1e-9
      : JSON.stringify(actual) === JSON.stringify(t.expectedOutput);
    return {{ index: i, passed, actual, expected: t.expectedOutput, input: t.input }};
  }});
  const summary = {{ total: results.length, passed: results.filter(r => r.passed).length, results }};
  return summary;
}}
const out = main();
console.log(JSON.stringify(out));
"""

    logger.info(
        "run_validation_tests_in_sandbox: tests=%d func=%s params=%s",
        len(validation_tests), func_name, param_names,
    )

    try:
        sandbox.files.write("script.js", harness)
        exec_result = sandbox.commands.run("node script.js")
        raw = exec_result.stdout or exec_result.stderr or "{}"
        logger.debug("run_validation_tests_in_sandbox raw=%s", raw)
        data = json.loads(raw)
    except Exception:
        logger.exception("run_validation_tests_in_sandbox: execution failed")
        raise

    try:
        total = int(data.get("total", 0))
        passed = int(data.get("passed", 0))
        failed = max(0, total - passed)
        logger.info(
            "run_validation_tests_in_sandbox summary: total=%d passed=%d failed=%d",
            total, passed, failed,
        )
    except Exception:
        pass

    return data

def get_evaluate_function(rag_data, user_prompt):
    """
    Create a chain to generate both a question and JavaScript function based on a user query.
    The RAG data contains previous user prompts and their respective JS function code.
    Given a new user prompt, generate the appropriate question and JS function code.
    Returns a Pydantic structured output.
    """
    llm = init_openai_model()
    rag_data_str = ""
    for item in rag_data:
        rag_data_str += f"Question: {item.get('question', '')}\nCode: {item.get('code', '')}\n\n"

    parser = PydanticOutputParser(pydantic_object=StructuredOutput)
    format_instructions = parser.get_format_instructions()

    template = """
You are an educational content generation system that creates math problems and their solution code.
Your output must be in the following JSON format:
{format_instructions}
Examples:
{rag_data_str}
Given a user prompt, your job is to generate:
1. A specific, concrete **math question** with actual numeric values and a well-defined numerical answer.
2. A **JavaScript function** that solves this math problem.
3. The function must include:
    - Function name
    - Properly named parameters
    - An input example (as a JSON object)
    - The expected output for that input
    - Validation logic or test case section containing exactly **10 test cases** in the format:
        [
          {{ "input": ..., "expectedOutput": ... }},
          ...
        ]
 4. A field `feedbackHints` containing exactly 10 short hints that help a student who answers incorrectly.
    - The hints must NOT reveal the final answer.
    - Focus on common mistakes, reminders, and step cues.
    - 1–2 sentences each, specific to this problem.
USER QUERY: "{user_prompt}"
IMPORTANT RULES:
- :white_check_mark: The question must be a **concrete math problem**, not a general request for a function.
- :white_check_mark: The JavaScript function must directly solve that problem and return the correct result.
- :white_check_mark: The "code" field must contain **only** the complete function definition — no example calls, no console.log statements, and no usage comments.
- :white_check_mark: Include a matching inputExample and expectedOutput as part of the structured JSON.
- :white_check_mark: The validationTests array must contain **10 diverse and valid test cases** to verify correctness.
- :white_check_mark: Provide exactly 10 hint-only feedbacks in `feedbackHints`; do not include the solution.
- :x: Do NOT return abstract tasks like "Write a function to calculate area."
- :x: Do NOT return a generic utility function.
- :x: Do NOT include any extra explanation, markdown, or natural language outside the JSON object.
GOOD QUESTION EXAMPLES:
- "What is the product of 8 and 12?"
- "What is the value of matrix multiplication of [[1,2],[2,3]] and [[3,8],[5,9]]?"
- "If a triangle has sides of length 3, 4, and 5, what is its area?"
BAD QUESTION EXAMPLES:
- "Write a JavaScript function that performs matrix multiplication"
- "Create a function to calculate the area of a triangle"
Your output must strictly follow the JSON format described above.
"""
    prompt = PromptTemplate(
        template=template,
        input_variables=["rag_data_str", "user_prompt", "format_instructions", "input"],
        partial_variables={"input": ""}  # Provide a default empty value for the input variable
    )
    chain = (
        {"rag_data_str": RunnablePassthrough(), "user_prompt": RunnablePassthrough(), "format_instructions": RunnablePassthrough(), "input": RunnablePassthrough()}
        | prompt
        | llm
        | parser
    )
    result = chain.invoke({
        "rag_data_str": rag_data_str,
        "user_prompt": user_prompt,
        "format_instructions": format_instructions,
        "input": ""  # Provide empty string for input
    })
    return result


def feedback_function(original_prompt, generated_function, test_cases, expected_outcomes):
    """
    Generate feedback for a validation function
    
    Args:
        original_prompt: The original problem statement
        generated_function: The JavaScript validation function
        test_cases: List of test inputs
        expected_outcomes: List of expected outcomes
        
    Returns:
        Dictionary with feedback results
    """
    from backend.src.meta_validation import validate_function
    
    # Validate the function
    validation_results = validate_function(
        original_prompt, generated_function, test_cases, expected_outcomes
    )
    
    # Generate feedback based on validation results
    is_correct = validation_results["accuracy_score"] > 0.8
    confidence_score = validation_results["accuracy_score"]
    
    feedback = "The function appears to be correct." if is_correct else "The function has issues."
    
    if validation_results["improvement_suggestions"]:
        feedback += " " + " ".join(validation_results["improvement_suggestions"])
    
    return {
        "is_correct": is_correct,
        "feedback": feedback,
        "confidence_score": confidence_score
    }


if __name__ == "__main__":
    llm = init_openai_model()
    rag_data = [
        {"question": "What is the product of 8 and 12?", "code": "function calculateAnswer() { return 8 * 12; } console.log(calculateAnswer());"},
        {"question": "What is the value of matrix multiplication of [[1,2],[2,3]] and [[3,8],[5,9]]?", "code": "function calculateAnswer() { return [[1,2],[2,3]] * [[3,8],[5,9]]; } console.log(calculateAnswer());"},
        {"question": "If a triangle has sides of length 3, 4, and 5, what is its area?", "code": "function calculateAnswer() { return 3 * 4 * 5; } console.log(calculateAnswer());"}
    ]
    user_prompt = "What is the product of 14 and 23?"
    result = get_evaluate_function(rag_data, user_prompt)
    logger.info("question=%s", result.question)
    logger.debug("generated_code=%s", result.code)
    
    # Execute the code to get the answer
    logger.info("executing generated code in sandbox")
    output = evaluate_code(result.code)
    logger.info("execution result: %s", output)