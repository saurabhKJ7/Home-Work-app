"""
Meta-validation framework to assess the accuracy of generated validation functions
"""
import json
from typing import Dict, List, Any, Tuple
from e2b import Sandbox
import os

# Reuse the sandbox from llm_chain.py
sandbox = Sandbox(template="base", api_key=os.getenv('E2B_API_KEY'))

def execute_validation_function(validation_function: str, test_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a validation function with test input and return the result
    """
    # Create a wrapper to execute the function
    wrapper = f"""
    {validation_function}
    
    const testInput = {json.dumps(test_input)};
    const result = evaluate(testInput);
    console.log(JSON.stringify(result));
    """
    
    try:
        sandbox.files.write("validation_test.js", wrapper)
        execution = sandbox.commands.run("node validation_test.js")
        output = execution.stdout or execution.stderr
        
        # Parse the JSON output
        result = json.loads(output.strip())
        return result
    except Exception as e:
        return {
            "error": str(e),
            "is_correct": False,
            "execution_failed": True
        }

def validate_function(
    original_prompt: str,
    validation_function: str,
    test_cases: List[Dict[str, Any]],
    expected_outcomes: List[bool]
) -> Dict[str, Any]:
    """
    Validate a generated function against test cases and expected outcomes
    
    Args:
        original_prompt: The original problem statement
        validation_function: The JavaScript validation function to test
        test_cases: List of test inputs
        expected_outcomes: List of expected boolean outcomes (True/False)
        
    Returns:
        Dict with validation results including accuracy metrics
    """
    if len(test_cases) != len(expected_outcomes):
        raise ValueError("Number of test cases must match number of expected outcomes")
    
    results = []
    false_positives = 0
    false_negatives = 0
    execution_failures = 0
    
    # Execute each test case
    for i, (test_case, expected) in enumerate(zip(test_cases, expected_outcomes)):
        result = execute_validation_function(validation_function, test_case)
        
        # Check for execution failures
        if result.get("execution_failed", False):
            execution_failures += 1
            results.append({
                "test_case_index": i,
                "expected": expected,
                "actual": "execution_failed",
                "error": result.get("error", "Unknown execution error")
            })
            continue
        
        # Get the actual result
        actual = result.get("is_correct", False)
        
        # Check for false positives and negatives
        if actual and not expected:
            false_positives += 1
        elif not actual and expected:
            false_negatives += 1
            
        results.append({
            "test_case_index": i,
            "expected": expected,
            "actual": actual,
            "details": result
        })
    
    # Calculate accuracy
    total_tests = len(test_cases)
    successful_tests = sum(1 for r in results if r.get("actual") == r.get("expected"))
    accuracy = successful_tests / total_tests if total_tests > 0 else 0
    
    # Determine confidence level
    confidence_level = "high" if accuracy >= 0.9 else "medium" if accuracy >= 0.7 else "low"
    
    return {
        "accuracy_score": accuracy,
        "false_positive_count": false_positives,
        "false_negative_count": false_negatives,
        "execution_failure_count": execution_failures,
        "confidence_level": confidence_level,
        "test_results": results,
        "improvement_suggestions": generate_improvement_suggestions(results, validation_function, original_prompt)
    }

def generate_improvement_suggestions(
    test_results: List[Dict[str, Any]],
    validation_function: str,
    original_prompt: str
) -> List[str]:
    """
    Generate improvement suggestions based on test results
    """
    suggestions = []
    
    # Check for execution failures
    execution_failures = [r for r in test_results if r.get("actual") == "execution_failed"]
    if execution_failures:
        suggestions.append("Fix runtime errors in the validation function")
    
    # Check for false positives
    false_positives = [r for r in test_results if r.get("actual") and not r.get("expected")]
    if false_positives:
        suggestions.append("Function incorrectly marks wrong answers as correct")
    
    # Check for false negatives
    false_negatives = [r for r in test_results if not r.get("actual") and r.get("expected")]
    if false_negatives:
        suggestions.append("Function incorrectly marks correct answers as wrong")
    
    # Check for missing error handling
    if "try {" not in validation_function or "catch" not in validation_function:
        suggestions.append("Add proper error handling with try/catch blocks")
    
    # Check for input validation
    if "if (!tableData" not in validation_function and "if (!submission" not in validation_function:
        suggestions.append("Add input validation to handle null/undefined values")
    
    return suggestions

def generate_test_cases(
    activity_type: str,
    problem_statement: str,
    correct_answers: List[Any]
) -> Tuple[List[Dict[str, Any]], List[bool]]:
    """
    Generate test cases based on activity type and problem statement
    
    Args:
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        problem_statement: The problem description
        correct_answers: List of known correct answers
        
    Returns:
        Tuple of (test_cases, expected_outcomes)
    """
    test_cases = []
    expected_outcomes = []
    
    # Add correct test cases
    for answer in correct_answers:
        if activity_type == "Grid-based":
            test_cases.append({"tableData": {"cells": answer}})
        else:
            test_cases.append({"submission": answer})
        expected_outcomes.append(True)
    
    # Add incorrect test cases (simplified approach)
    # In a real implementation, this would be more sophisticated
    if activity_type == "Grid-based":
        # Empty grid
        test_cases.append({"tableData": {"cells": []}})
        expected_outcomes.append(False)
        
        # Null input
        test_cases.append({"tableData": None})
        expected_outcomes.append(False)
    else:
        # Empty submission
        test_cases.append({"submission": ""})
        expected_outcomes.append(False)
        
        # Null submission
        test_cases.append({"submission": None})
        expected_outcomes.append(False)
    
    return test_cases, expected_outcomes
