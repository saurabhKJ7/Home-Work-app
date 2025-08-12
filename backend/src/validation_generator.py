"""
Improved validation function generator with standardized templates and error handling
"""
from typing import Dict, Any, List
import os
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.prompts import PromptTemplate
from src.validation_templates import (
    GRID_VALIDATION_TEMPLATE,
    MATH_VALIDATION_TEMPLATE,
    LOGIC_VALIDATION_TEMPLATE,
    FEEDBACK_TEMPLATE
)
from src.improved_rag import get_enhanced_rag_data

def get_template_for_activity_type(activity_type: str) -> str:
    """
    Get the appropriate template for the activity type
    
    Args:
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        
    Returns:
        Template string
    """
    if activity_type == "Grid-based":
        return GRID_VALIDATION_TEMPLATE
    elif activity_type == "Mathematical":
        return MATH_VALIDATION_TEMPLATE
    elif activity_type == "Logical":
        return LOGIC_VALIDATION_TEMPLATE
    else:
        # Default to grid template
        return GRID_VALIDATION_TEMPLATE

DEFAULT_GPT_MODEL = os.getenv("GPT_MODEL", "gpt-5-mini")

def generate_validation_function(
    prompt: str,
    activity_type: str,
    model_name: str = DEFAULT_GPT_MODEL
) -> Dict[str, str]:
    """
    Generate a validation function using templates and improved RAG
    
    Args:
        prompt: The problem statement
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        model_name: Name of the model to use (default: gpt-4o)
        
    Returns:
        Dictionary with validation and feedback functions
    """
    # Get enhanced RAG data
    rag_data = get_enhanced_rag_data(prompt, activity_type)
    
    # Format RAG data for prompt
    rag_examples = ""
    for item in rag_data:
        rag_examples += f"Problem: {item.get('prompt', '')}\n"
        rag_examples += f"Code: {item.get('code', '')}\n\n"
    
    # Get template
    template_base = get_template_for_activity_type(activity_type)
    
    # Initialize LLM
    if "gpt" in model_name.lower():
        llm = ChatOpenAI(model=model_name, temperature=0.2)
    elif "claude" in model_name.lower():
        llm = ChatAnthropic(model=model_name, temperature=0.2)
    else:
        # Fallback to env default rather than hardcoding
        llm = ChatOpenAI(model=DEFAULT_GPT_MODEL, temperature=0.2)
    
    # Create prompt template for validation function
    validation_prompt_template = """
    You are an expert JavaScript developer specializing in educational validation functions.
    
    You need to create a validation function for the following problem:
    {prompt}
    
    The activity type is: {activity_type}
    
    I'll provide you with a template that includes error handling and input validation.
    Your task is to fill in the validation logic where indicated by {VALIDATION_LOGIC}.
    
    Here are some similar examples for reference:
    {rag_examples}
    
    Template:
    {template}
    
    Important guidelines:
    1. Handle edge cases (empty inputs, invalid formats)
    2. Check for multi-condition validation
    3. Return the correct structure with is_correct and condition_level_is_correct
    4. Use try/catch for error handling
    5. Include comments explaining your logic
    
    Replace {VALIDATION_LOGIC} with your implementation.
    Return ONLY the complete function with your implementation.
    """
    
    validation_prompt = PromptTemplate(
        template=validation_prompt_template,
        input_variables=["prompt", "activity_type", "rag_examples", "template"]
    )
    
    # Use invoke instead of run (to fix deprecation warning)
    validation_result = llm.invoke(validation_prompt.format(
        prompt=prompt,
        activity_type=activity_type,
        rag_examples=rag_examples,
        template=template_base
    )).content
    
    # Create prompt template for feedback function
    feedback_prompt_template = """
    You are an expert JavaScript developer specializing in educational feedback functions.
    
    You need to create a feedback function for the following problem:
    {prompt}
    
    The activity type is: {activity_type}
    
    I'll provide you with a template that includes error handling.
    Your task is to fill in the feedback logic where indicated by {FEEDBACK_LOGIC}.
    
    Template:
    {template}
    
    Important guidelines:
    1. Provide encouraging feedback for correct answers
    2. Give constructive guidance for incorrect answers
    3. Adjust feedback based on attempt number
    4. Don't reveal the complete solution
    
    Replace {FEEDBACK_LOGIC} with your implementation.
    Return ONLY the complete function with your implementation.
    """
    
    feedback_prompt = PromptTemplate(
        template=feedback_prompt_template,
        input_variables=["prompt", "activity_type", "template"]
    )
    
    # Use invoke instead of run (to fix deprecation warning)
    feedback_result = llm.invoke(feedback_prompt.format(
        prompt=prompt,
        activity_type=activity_type,
        template=FEEDBACK_TEMPLATE
    )).content
    
    return {
        "validation_function": validation_result.strip(),
        "feedback_function": feedback_result.strip()
    }