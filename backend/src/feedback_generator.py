"""
Adaptive feedback generator for different response types
"""
from typing import Dict, Any, List, Optional
import os
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

def generate_feedback(
    is_correct: bool,
    prompt: str,
    submission: Any,
    attempt_number: int = 1,
    activity_type: Optional[str] = None,
    hints: Optional[List[str]] = None,
    partial_correct: bool = False,
    validation_details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generate contextually appropriate feedback based on correctness and attempt number
    
    Args:
        is_correct: Whether the answer is correct
        prompt: The original problem statement
        submission: The student's submission
        attempt_number: The number of attempts made (default: 1)
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        
    Returns:
        Dictionary with feedback properties
    """
    # Default feedback structure
    feedback = {
        "tableStartSound": "neutral",
        "tableEndSound": "neutral",
        "tableEndText": "Keep trying!",
        "tableEndSticker": "neutral"
    }
    
    # Correct answer feedback
    if is_correct:
        feedback["tableStartSound"] = "success"
        feedback["tableEndSound"] = "success"
        feedback["tableEndSticker"] = "success"
        
        if attempt_number <= 1:
            feedback["tableEndText"] = "Excellent! You got it right on your first try!"
        elif attempt_number <= 3:
            feedback["tableEndText"] = "Great job! You figured it out!"
        else:
            feedback["tableEndText"] = "You did it! Persistence pays off!"
    
    # Incorrect or partial answer feedback
    else:
        feedback["tableStartSound"] = "incorrect"
        feedback["tableEndSound"] = "incorrect"
        feedback["tableEndSticker"] = "incorrect"
        
        # Tailor feedback based on attempt number
        if attempt_number == 1:
            feedback["tableEndText"] = "Not quite right. Take another look and try again."
        elif attempt_number == 2:
            feedback["tableEndText"] = "Still not correct. Think about the problem carefully."
        elif attempt_number == 3:
            feedback["tableEndText"] = "Let's keep trying. Consider a different approach."
        else:
            feedback["tableEndText"] = "Keep at it! Remember the key requirements of the problem."

        # If model-provided hints are available, append a varying hint
        if hints:
            try:
                idx = (attempt_number - 1) % max(1, len(hints))
                hint = str(hints[idx]).strip()
                if hint:
                    feedback["tableEndText"] = f"{feedback['tableEndText']} Hint: {hint}"
            except Exception:
                # If anything goes wrong with hints selection, fall back silently
                pass

        # Partial correctness indicator
        if partial_correct and not is_correct:
            feedback["tableEndSticker"] = "partial"
            # Nudge the text to reflect partial progress
            feedback["tableEndText"] = f"You're on the right track. {feedback['tableEndText']}"
    
    # Add activity-specific feedback
    if activity_type:
        feedback["tableEndText"] = add_activity_specific_guidance(
            feedback["tableEndText"], 
            activity_type, 
            is_correct, 
            attempt_number
        )
    
    return feedback

def add_activity_specific_guidance(
    base_feedback: str,
    activity_type: str,
    is_correct: bool,
    attempt_number: int
) -> str:
    """
    Add activity-specific guidance to feedback
    
    Args:
        base_feedback: The base feedback text
        activity_type: Type of activity
        is_correct: Whether the answer is correct
        attempt_number: The number of attempts made
        
    Returns:
        Enhanced feedback text
    """
    if is_correct:
        return base_feedback
    
    # Only add specific guidance after first attempt
    if attempt_number <= 1:
        return base_feedback
    
    # Activity-specific guidance
    if activity_type == "Grid-based":
        if attempt_number == 2:
            return f"{base_feedback} Check the grid patterns carefully."
        else:
            return f"{base_feedback} Look for relationships between cells."
    
    elif activity_type == "Mathematical":
        if attempt_number == 2:
            return f"{base_feedback} Double-check your calculations."
        else:
            return f"{base_feedback} Consider different mathematical approaches."
    
    elif activity_type == "Logical":
        if attempt_number == 2:
            return f"{base_feedback} Think about the logical sequence."
        else:
            return f"{base_feedback} Try breaking the problem into smaller steps."
    
    return base_feedback

DEFAULT_GPT_MODEL = os.getenv("GPT_MODEL", "gpt-5-mini")
# Smaller, cost-effective feedback model (distinct from GPT_MODEL)
FEEDBACK_MODEL = os.getenv("FEEDBACK_MODEL", "gpt-4o-mini")

def generate_llm_feedback(
    prompt: str,
    submission: Any,
    is_correct: bool,
    attempt_number: int,
    activity_type: str = None
) -> str:
    """
    Generate more detailed feedback using LLM
    
    Args:
        prompt: The original problem statement
        submission: The student's submission
        is_correct: Whether the answer is correct
        attempt_number: The number of attempts made
        activity_type: Type of activity
        
    Returns:
        Detailed feedback text
    """
    llm = ChatOpenAI(model=FEEDBACK_MODEL, temperature=0.3)
    
    template = """
    You are an educational feedback generator for {activity_type} activities.
    
    Problem statement: {prompt}
    Student submission: {submission}
    Outcome: {correctness_status}
    Attempt number: {attempt_number}
    Partial correctness: {partial_status}
    Error summary (if any): {error_summary}
    
    Requirements:
    - If correct: provide positive reinforcement, specifically acknowledge what was done right, and suggest progression/celebration cues.
    - If incorrect: give constructive, non-revealing guidance; vary tone and specificity by attempt_number; include a redirective hint.
    - If partial: recognize what is correct, clearly indicate remaining requirements, encourage and give a specific next step.
    - Keep it concise (1–2 sentences). Avoid revealing the full solution.
    """
    
    correctness_status = "correct" if is_correct else "incorrect"
    
    prompt_template = PromptTemplate(
        template=template,
        input_variables=[
            "activity_type",
            "prompt",
            "submission",
            "correctness_status",
            "attempt_number",
            "partial_status",
            "error_summary",
        ],
    )
    
    chain = LLMChain(llm=llm, prompt=prompt_template)
    
    result = chain.run(
        activity_type=activity_type or "educational",
        prompt=prompt,
        submission=str(submission),
        correctness_status=correctness_status,
        attempt_number=attempt_number,
        partial_status="partial" if not is_correct else "none",
        error_summary="",
    )
    
    return result.strip()
