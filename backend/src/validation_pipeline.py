"""
Automated validation pipeline for quality assurance
"""
from typing import Dict, Any, List, Optional
from src.validation_generator import generate_validation_function
from src.test_generator import generate_test_cases
from src.meta_validation import validate_function
from models.schema import ValidationResponse

def run_validation_pipeline(
    prompt: str,
    activity_type: str,
    correct_answers: Optional[List[Any]] = None,
    model_name: str = "gpt-4o",
    confidence_threshold: float = 0.8
) -> Dict[str, Any]:
    """
    Run the complete validation pipeline
    
    Args:
        prompt: The problem statement
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        correct_answers: List of known correct answers (optional)
        model_name: Name of the model to use
        confidence_threshold: Minimum confidence score required
        
    Returns:
        Dictionary with validation results
    """
    # Step 1: Generate validation and feedback functions
    functions = generate_validation_function(prompt, activity_type, model_name)
    validation_function = functions["validation_function"]
    feedback_function = functions["feedback_function"]
    
    # Step 2: Generate test cases
    test_cases, expected_outcomes = generate_test_cases(
        prompt, activity_type, correct_answers
    )
    
    # Step 3: Validate the function
    validation_results = validate_function(
        prompt, validation_function, test_cases, expected_outcomes
    )
    
    # Step 4: Check if confidence is above threshold
    if validation_results["accuracy_score"] < confidence_threshold:
        # If below threshold, regenerate with more specific instructions
        improved_functions = generate_validation_function(
            f"IMPORTANT: Previous attempt had issues. {' '.join(validation_results['improvement_suggestions'])}\n\nOriginal prompt: {prompt}",
            activity_type,
            model_name
        )
        validation_function = improved_functions["validation_function"]
        feedback_function = improved_functions["feedback_function"]
        
        # Re-validate
        validation_results = validate_function(
            prompt, validation_function, test_cases, expected_outcomes
        )
    
    return {
        "validation_function": validation_function,
        "feedback_function": feedback_function,
        "test_cases": test_cases,
        "expected_outcomes": expected_outcomes,
        "validation_results": validation_results,
        "is_reliable": validation_results["accuracy_score"] >= confidence_threshold
    }

def validate_student_submission(
    validation_function: str,
    submission: Any,
    activity_type: str,
    attempt_number: int = 1
) -> ValidationResponse:
    """
    Validate a student submission using a validation function
    
    Args:
        validation_function: The JavaScript validation function
        submission: The student's submission
        activity_type: Type of activity
        attempt_number: The number of attempts made
        
    Returns:
        ValidationResponse with is_correct, feedback, and confidence_score
    """
    from src.meta_validation import execute_validation_function
    from src.feedback_generator import generate_feedback
    
    # Prepare input for validation function
    if activity_type == "Grid-based":
        input_data = {"tableData": {"cells": submission}}
    else:
        input_data = {"submission": submission}
    
    # Add attempt number to context
    input_data["global_context_variables"] = {"attempt_number": attempt_number}
    
    # Execute validation function
    result = execute_validation_function(validation_function, input_data)
    
    # Check if execution failed
    if result.get("execution_failed", False):
        return ValidationResponse(
            is_correct=False,
            feedback="Sorry, there was an error processing your answer. Please try again.",
            confidence_score=0.0
        )
    
    # Get correctness
    is_correct = result.get("is_correct", False)
    
    # Generate feedback
    feedback_data = generate_feedback(
        is_correct,
        "Problem statement",  # This should be replaced with actual prompt
        submission,
        attempt_number,
        activity_type
    )
    
    return ValidationResponse(
        is_correct=is_correct,
        feedback=feedback_data["tableEndText"],
        confidence_score=0.9 if not result.get("error") else 0.5,
        metadata={
            "feedback_data": feedback_data,
            "validation_details": result
        }
    )