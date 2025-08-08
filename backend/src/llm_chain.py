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





def get_evaluate_function(llm, rag_data):
    """
    Create a chain to generate both a question and JavaScript function based on a user query.
    The RAG data contains previous user prompts and their respective JS function code.
    Given a new user prompt, generate the appropriate question and JS function code.
    """
    rag_data_str = ""
    for item in rag_data:
        rag_data_str += f"Prompt: {item['prompt']}\nQuestion: {item.get('question', '')}\nCode: {item['code']}\n\n"

    template = """
You are an educational content generation system that creates math problems and their solution code.
Your output must be in a specific format that will be parsed by the system.
DO NOT include ANY explanations, markdown formatting, or anything outside the specified format.

Examples:
{rag_data}

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
    prompt = PromptTemplate(
        template=template,
        input_variables=["rag_data", "user_prompt"]
    )
    return LLMChain(llm=llm, prompt=prompt)



def feedback_function(user_response,generated_function):
    """
    Generate feedback on a generated function based on test cases and expected outcomes.
    """
    response=str(evaluate_code(generated_function))
    user_response = str(user_response)
    if response==user_response:
        return "The generated function works correctly."
    else:
        return f"The generated function did not produce the expected result. Expected: {user_response}, Got: {response}"






if __name__ == "__main__":
    code='function calculateAnswer() { return 14 * 23; } console.log(calculateAnswer());'
    result = feedback_function(322, code)
    print(result)
