"""
Tests for validation functions
"""
import pytest
import os
import sys
import json
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from src.validation_generator import generate_validation_function
from src.test_generator import generate_test_cases
from src.meta_validation import validate_function
from src.validation_pipeline import run_validation_pipeline

# Sample problem statements for different activity types
GRID_PROBLEM = "Create a Sudoku puzzle where each row, column, and 3x3 box contains the numbers 1-9 without repetition."
MATH_PROBLEM = "Solve for x in the equation 2x + 5 = 13."
LOGIC_PROBLEM = "What comes next in the sequence: 2, 6, 18, 54, ?"

def test_validation_generator():
    """Test validation function generation"""
    # Test grid-based activity
    grid_functions = generate_validation_function(GRID_PROBLEM, "Grid-based")
    assert "function evaluate" in grid_functions["validation_function"]
    assert "function feedbackFunction" in grid_functions["feedback_function"]
    
    # Test mathematical activity
    math_functions = generate_validation_function(MATH_PROBLEM, "Mathematical")
    assert "function evaluate" in math_functions["validation_function"]
    assert "function feedbackFunction" in math_functions["feedback_function"]
    
    # Test logical activity
    logic_functions = generate_validation_function(LOGIC_PROBLEM, "Logical")
    assert "function evaluate" in logic_functions["validation_function"]
    assert "function feedbackFunction" in logic_functions["feedback_function"]

def test_test_generator():
    """Test test case generation"""
    # Test with grid-based activity
    grid_test_cases, grid_expected = generate_test_cases(
        GRID_PROBLEM, "Grid-based", num_test_cases=3
    )
    assert len(grid_test_cases) == len(grid_expected)
    
    # Test with mathematical activity
    math_test_cases, math_expected = generate_test_cases(
        MATH_PROBLEM, "Mathematical", correct_answers=[4], num_test_cases=3
    )
    assert len(math_test_cases) == len(math_expected)
    
    # Test with logical activity
    logic_test_cases, logic_expected = generate_test_cases(
        LOGIC_PROBLEM, "Logical", correct_answers=["162"], num_test_cases=3
    )
    assert len(logic_test_cases) == len(logic_expected)

def test_meta_validation():
    """Test meta-validation of functions"""
    # Simple validation function for testing
    validation_function = """
    function evaluate(params) {
        const { submission } = params;
        return {
            is_correct: submission === 4,
            condition_level_is_correct: [submission === 4]
        };
    }
    """
    
    # Test cases
    test_cases = [
        {"submission": 4},
        {"submission": 5},
        {"submission": None}
    ]
    expected_outcomes = [True, False, False]
    
    # Validate function
    results = validate_function(
        MATH_PROBLEM, validation_function, test_cases, expected_outcomes
    )
    
    assert "accuracy_score" in results
    assert "false_positive_count" in results
    assert "false_negative_count" in results
    assert "confidence_level" in results
    assert "improvement_suggestions" in results

def test_validation_pipeline():
    """Test the complete validation pipeline"""
    # Run pipeline for a simple math problem
    pipeline_results = run_validation_pipeline(
        "What is 2 + 2?",
        "Mathematical",
        correct_answers=[4]
    )
    
    assert "validation_function" in pipeline_results
    assert "feedback_function" in pipeline_results
    assert "test_cases" in pipeline_results
    assert "expected_outcomes" in pipeline_results
    assert "validation_results" in pipeline_results
    assert "is_reliable" in pipeline_results
