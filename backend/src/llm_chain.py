import os
import json 
from typing import Dict, Any, List
from langchain_anthropic import ChatAnthropic
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
load_dotenv()




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
    
    return LangSmithTracer(
        project_name="educational-rag-system"
    )




def create_code_generation_chain(llm, rag_data):
    """
    Create a chain to generate a JavaScript function based on a user query.
    The RAG data contains previous user prompts and their respective JS function code.
    Given a new user prompt, generate the appropriate JS function code.
    """
    template = """
You are an expert JavaScript developer.

Below are examples of user prompts and the corresponding JavaScript function code:

{rag_data}

Now, given the following user prompt, generate the JavaScript function code that fulfills the request.

USER PROMPT:
{user_prompt}

Return only the JavaScript function code.
"""
    prompt = PromptTemplate(
        template=template,
        input_variables=["rag_data", "user_prompt"]
    )
    return LLMChain(llm=llm, prompt=prompt)







def get_evulate_function(rag_data,user_prompt: str):
    """Evaluate a function against test cases"""
    
    llmchain= create_code_generation_chain(init_anthropic_model(), rag_data)
    return llmchain.invoke({"rag_data": rag_data, "user_prompt": user_prompt})

    



def feedback_function(original_prompt, generated_function, test_cases, expected_outcomes):
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
    try:
        return json.loads(result)
    except Exception:
        return {
            "is_correct": False,
            "feedback": "Unable to evaluate the function automatically.",
            "confidence_score": 0.0
        }
    






if __name__ == "__main__":
    llm= init_anthropic_model()
    rag_data=[{'prompt':'What is the sum of two numbers?', 'code': 'function sum(a, b) { return a + b; }'}]
    user_prompt = "Write a function to calculate the product of two numbers."
    result = get_evulate_function(rag_data, user_prompt)    
    print(result)

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