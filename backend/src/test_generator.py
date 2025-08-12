"""
Test case generator for validation functions
"""
from typing import Dict, Any, List, Tuple
import os
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
import json

DEFAULT_GPT_MODEL = os.getenv("GPT_MODEL", "gpt-5-mini")

def generate_test_cases(
    prompt: str,
    activity_type: str,
    correct_answers: List[Any] = None,
    num_test_cases: int = 5
) -> Tuple[List[Dict[str, Any]], List[bool]]:
    """
    Generate test cases for a validation function
    
    Args:
        prompt: The problem statement
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        correct_answers: List of known correct answers (optional)
        num_test_cases: Number of test cases to generate
        
    Returns:
        Tuple of (test_cases, expected_outcomes)
    """
    llm = ChatOpenAI(model=DEFAULT_GPT_MODEL, temperature=0.3)
    
    template = """
    You are an expert test case generator for educational activities.
    
    Problem statement: {prompt}
    Activity type: {activity_type}
    
    Generate {num_test_cases} test cases for this problem. Include both correct and incorrect answers.
    
    For each test case, provide:
    1. The test input that would be passed to the validation function
    2. Whether the answer should be considered correct (true/false)
    3. A brief explanation of why it's correct or incorrect
    
    Format your response as a JSON array of objects with the following structure:
    [
      {{
        "input": {{...}},
        "expected": true/false,
        "explanation": "..."
      }},
      ...
    ]
    
    For Grid-based activities, the input should have a tableData.cells structure.
    For Mathematical activities, the input should have a submission field.
    For Logical activities, the input should have a submission field.
    
    {correct_answers_prompt}
    
    Return ONLY the JSON array with no additional text.
    """
    
    correct_answers_prompt = ""
    if correct_answers:
        correct_answers_prompt = f"Known correct answers: {json.dumps(correct_answers)}"
    
    prompt_template = PromptTemplate(
        template=template,
        input_variables=["prompt", "activity_type", "num_test_cases", "correct_answers_prompt"]
    )
    
    chain = LLMChain(llm=llm, prompt=prompt_template)
    
    result = chain.run(
        prompt=prompt,
        activity_type=activity_type,
        num_test_cases=num_test_cases,
        correct_answers_prompt=correct_answers_prompt
    )
    
    # Parse the JSON response
    try:
        test_cases_data = json.loads(result)
        
        # Extract test cases and expected outcomes
        test_cases = [tc["input"] for tc in test_cases_data]
        expected_outcomes = [tc["expected"] for tc in test_cases_data]
        
        return test_cases, expected_outcomes
    except json.JSONDecodeError:
        # Fallback to simple test cases if parsing fails
        return generate_fallback_test_cases(activity_type, correct_answers)

def generate_fallback_test_cases(
    activity_type: str,
    correct_answers: List[Any] = None
) -> Tuple[List[Dict[str, Any]], List[bool]]:
    """
    Generate fallback test cases when LLM-based generation fails
    
    Args:
        activity_type: Type of activity
        correct_answers: List of known correct answers
        
    Returns:
        Tuple of (test_cases, expected_outcomes)
    """
    test_cases = []
    expected_outcomes = []
    
    # Add correct test cases from provided answers
    if correct_answers:
        for answer in correct_answers:
            if activity_type == "Grid-based":
                test_cases.append({"tableData": {"cells": answer}})
            else:
                test_cases.append({"submission": answer})
            expected_outcomes.append(True)
    
    # Add basic incorrect test cases
    if activity_type == "Grid-based":
        test_cases.append({"tableData": {"cells": []}})
        expected_outcomes.append(False)
        
        test_cases.append({"tableData": None})
        expected_outcomes.append(False)
    else:
        test_cases.append({"submission": ""})
        expected_outcomes.append(False)
        
        test_cases.append({"submission": None})
        expected_outcomes.append(False)
    
    return test_cases, expected_outcomes
