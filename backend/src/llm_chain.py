import os
import json 
import re
from typing import Dict, Any, List
from langchain_anthropic import ChatAnthropic
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
load_dotenv()


LANGSMITH_TRACING="true"
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY="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"
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





def create_code_generation_chain(llm, rag_data):
    """
    Create a chain to generate both a question and JavaScript function based on a user query.
    The RAG data contains previous user prompts and their respective JS function code.
    Given a new user prompt, generate the appropriate question and JS function code.
    """
    template = """
You are an educational content generation system that creates math problems and their solution code.
Your output must be in a specific format that will be parsed by the system.
DO NOT include ANY explanations, markdown formatting, or anything outside the specified format.

Examples:
{rag_data}

Task:
Create a math problem and JavaScript function that fulfills this request: {user_prompt}

Output format:
question: "The specific math problem to solve"
code: "function name(a, b) { return a + b; }"

Ensure your output ONLY contains the question and code lines exactly as shown above.
Do NOT include any function wrappers, JSON formatting, or any other content.
"""
    prompt = PromptTemplate(
        template=template,
        input_variables=["rag_data", "user_prompt"]
    )
    return LLMChain(llm=llm, prompt=prompt)







def get_evaluate_function(rag_data, user_prompt: str) -> dict:
    """Generate question and JS function code based on RAG and prompt."""
    llm = init_anthropic_model()
    
    # Convert rag_data to string representation
    rag_data_str = ""
    for item in rag_data:
        rag_data_str += f"Prompt: {item['prompt']}\nQuestion: {item.get('question', '')}\nCode: {item['code']}\n\n"
    
    # Create a direct prompt without using LLMChain
    prompt = f"""
You are an educational content generation system that creates math problems and their solution code.
Your output must be in a specific format that will be parsed by the system.
DO NOT include ANY explanations, markdown formatting, or anything outside the specified format.

Examples:
{rag_data_str}

Task:
Create a specific math problem (not a coding task) and JavaScript function that fulfills this request: {user_prompt}

IMPORTANT: The question must be a specific math problem with concrete values that has a numerical answer, NOT a request to write code.

GOOD EXAMPLES:
- "What is the product of 8 and 12?"
- "What is the value of matrix multiplication of [[1,2],[2,3]] and [[3,8],[5,9]]?"
- "If a triangle has sides of length 3, 4, and 5, what is its area?"

BAD EXAMPLES:
- "Write a JavaScript function that performs matrix multiplication"
- "Create a function to calculate the area of a triangle"

Output format:
question: "The specific math problem to solve with concrete values"
code: "function calculateAnswer(input) {{ // JavaScript code that solves this specific problem }}"

Ensure your output ONLY contains the question and code lines exactly as shown above.
Do NOT include any function wrappers, JSON formatting, or any other content.
"""
    
    # Use the model directly
    response = llm.invoke(prompt)
    
    # Extract the text from the result
    if hasattr(response, "content"):
        text = response.content
    else:
        text = str(response)
    
    # Clean the output if needed
    text = text.strip()
    
    # If the model still added markdown formatting, remove it
    if "```" in text:
        text = re.sub(r'```(?:javascript|js|json)?([\s\S]*?)```', r'\1', text).strip()
    
    print("DEBUG - Raw output:", text)
    
    # Extract question and code using regex patterns for the simple format
    question_match = re.search(r'question:\s*[\'"]?(.+?)[\'"]?$', text, re.MULTILINE)
    code_match = re.search(r'code:\s*[\'"]?(.+?)[\'"]?$', text, re.MULTILINE)
    
    if question_match and code_match:
        question = question_match.group(1).strip('"\'')
        code = code_match.group(1).strip('"\'')
        print(f"Extracted question: {question}")
        print(f"Extracted code: {code}")
        return {
            "question": question,
            "code": code
        }
    
    # Try alternative regex patterns
    question_match = re.search(r'question:\s*[\'"](.+?)[\'"]', text)
    code_match = re.search(r'code:\s*[\'"](.+?)[\'"]', text, re.DOTALL)
    
    if question_match and code_match:
        return {
            "question": question_match.group(1),
            "code": code_match.group(1).replace('\\n', '\n').replace('\\"', '"')
        }
    
    # If all parsing fails, return a default response
    return {
        "question": "What is the result of the calculation?",
        "code": "function calculate() { return 0; }"
    }

def feedback_function(original_prompt: str, generated_function: str, test_cases, expected_outcomes):
    """
    Use LLM to provide feedback on the generated function based on the original prompt, test cases, and expected outcomes.
    """
    llm = init_anthropic_model()
    prompt_template = """
You are an expert programming tutor.

Below is a user prompt describing a function to implement:
USER PROMPT:
{original_prompt}

Here is the JavaScript function generated:
GENERATED FUNCTION:
{generated_function}

Here are the test cases and their expected outcomes:
{test_cases_and_outcomes}

Please review the generated function. Analyze if it correctly implements the user prompt and passes all the test cases. 
Return a JSON with:
1. is_correct: boolean (true if the function is correct)
2. feedback: string (constructive feedback or suggestions for improvement)
3. confidence_score: float between 0 and 1
"""
    # Format test cases and expected outcomes for the prompt
    test_cases_text = "\n".join([
        f"Test Case {i+1}: Input: {tc}, Expected Output: {eo}"
        for i, (tc, eo) in enumerate(zip(test_cases, expected_outcomes))
    ])

    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["original_prompt", "generated_function", "test_cases_and_outcomes"]
    )

    chain = LLMChain(llm=llm, prompt=prompt)
    result = chain.invoke({
        "original_prompt": original_prompt,
        "generated_function": generated_function,
        "test_cases_and_outcomes": test_cases_text
    })
    # Normalize and parse JSON from model output
    parsed = None
    if isinstance(result, dict):
        text = result.get("text") or result.get("content") or ""
    else:
        text = str(result)
    try:
        parsed = json.loads(text)
    except Exception:
        parsed = None
    if isinstance(parsed, dict):
        return {
            "is_correct": bool(parsed.get("is_correct", False)),
            "feedback": str(parsed.get("feedback", "")),
            "confidence_score": float(parsed.get("confidence_score", 0.0)),
        }
    return {
        "is_correct": False,
        "feedback": "Unable to evaluate the function automatically.",
        "confidence_score": 0.0,
    }
    




    






if __name__ == "__main__":
    llm = init_anthropic_model()
    rag_data = [
        {
            'prompt': 'Give me assignment on sum of numbers',
            'question': 'What is the sum of 5 and 7?',
            'code': 'function sum(a, b) { return a + b; }'
        }
    ]
    user_prompt = "Give me assignment on product of numbers"
    result = get_evaluate_function(rag_data, user_prompt)    
    print(json.dumps(result, indent=2))

    # llm=init_openai_model()
    # original_prompt='generate a function that takes two numbers and returns their sum'
    # generated_function='function sum(a, b) { return a + b; }'
    # test_cases= [
    #     {"input": [1, 2], "expected": 3},
    #     {"input": [5, 7], "expected": 12},
    #     {"input": [-1, -1], "expected": -2}
    # ]
    # expected_outcomes= [3, 12, -2]
    # feedback = feedback_function(original_prompt, generated_function, test_cases, expected_outcomes)
    # print(feedback)