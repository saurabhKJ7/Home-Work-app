import os
import json 
import re
from typing import Dict, Any, List
from langchain_anthropic import ChatAnthropic
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
from e2b import Sandbox
load_dotenv()

from pydantic import BaseModel, Field
class StructuredOutput(BaseModel):
    question: str = Field(description="The specific math problem to solve with concrete values")
    code: str = Field(description="function calculateAnswer(input) { // JavaScript code that solves this specific problem }")


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



from e2b import Sandbox

sandbox = Sandbox(template="base", api_key=os.getenv('E2B_API_KEY'))  # create once

def evaluate_code(code):
    import time 
    initial_time = time.time()
    sandbox.files.write("script.js", code)
    execution = sandbox.commands.run("node script.js")
    final_time = time.time()
    print(f"Execution time: {final_time - initial_time:.2f} seconds")
    return execution.stdout or execution.stderr



from langchain.output_parsers import PydanticOutputParser

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
{format_instructions}

Ensure your output ONLY contains the JSON object as shown above.
"""
    prompt = PromptTemplate(
        template=template,
        input_variables=["rag_data_str", "user_prompt", "format_instructions"]
    )
    chain = LLMChain(llm=llm, prompt=prompt, output_parser=parser)
    result = chain.invoke({
        "rag_data_str": rag_data_str,
        "user_prompt": user_prompt,
        "format_instructions": format_instructions
    })
    return result["text"]


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
    print(f"\nQuestion: {result.question}")
    print(f"Answer Code: {result.code}")
    
    # Execute the code to get the answer
    print("\nExecuting code...")
    output = evaluate_code(result.code)
    print(f"Result: {output}")