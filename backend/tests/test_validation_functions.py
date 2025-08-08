"""
Test validation functions and meta-validation
"""
import pytest
import sys
import os
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from src.validation_generator import generate_validation_function
from src.meta_validation import validate_function, execute_validation_function
from src.test_generator import generate_test_cases

# Test data
GRID_PROBLEM = "Create a grid where all cells contain odd numbers."
MATH_PROBLEM = "What is the sum of 5 and 7?"
LOGIC_PROBLEM = "What comes next in the sequence: 2, 4, 8, 16, ?"

# Sample validation functions
GRID_VALIDATION = """
function evaluate(params) {
  try {
    const { tableData } = params || {};
    if (!tableData || !tableData.cells) {
      return {
        is_correct: false,
        cell_level_is_correct: [],
        condition_level_is_correct: [false]
      };
    }
    
    const cells = tableData.cells;
    let allOdd = true;
    const cellCorrectness = [];
    
    for (let i = 0; i < cells.length; i++) {
      const isOdd = cells[i] % 2 !== 0;
      cellCorrectness.push(isOdd);
      if (!isOdd) {
        allOdd = false;
      }
    }
    
    return {
      is_correct: allOdd,
      cell_level_is_correct: cellCorrectness,
      condition_level_is_correct: [allOdd]
    };
  } catch (error) {
    return {
      is_correct: false,
      cell_level_is_correct: [],
      condition_level_is_correct: [false],
      error: error.message
    };
  }
}
"""

MATH_VALIDATION = """
function evaluate(params) {
  try {
    const { submission } = params || {};
    if (submission === undefined || submission === null) {
      return {
        is_correct: false,
        condition_level_is_correct: [false]
      };
    }
    
    const userAnswer = typeof submission === 'string' ? parseFloat(submission) : submission;
    const isCorrect = userAnswer === 12;
    
    return {
      is_correct: isCorrect,
      condition_level_is_correct: [isCorrect]
    };
  } catch (error) {
    return {
      is_correct: false,
      condition_level_is_correct: [false],
      error: error.message
    };
  }
}
"""

LOGIC_VALIDATION = """
function evaluate(params) {
  try {
    const { submission } = params || {};
    if (submission === undefined || submission === null) {
      return {
        is_correct: false,
        condition_level_is_correct: [false]
      };
    }
    
    const userAnswer = typeof submission === 'string' ? submission.trim() : String(submission);
    const isCorrect = userAnswer === '32';
    
    return {
      is_correct: isCorrect,
      condition_level_is_correct: [isCorrect]
    };
  } catch (error) {
    return {
      is_correct: false,
      condition_level_is_correct: [false],
      error: error.message
    };
  }
}
"""

def test_execute_validation_function():
    """Test execute_validation_function"""
    # Test grid validation
    grid_result = execute_validation_function(
        GRID_VALIDATION,
        {"tableData": {"cells": [1, 3, 5, 7]}}
    )
    assert grid_result["is_correct"] == True
    
    grid_result_invalid = execute_validation_function(
        GRID_VALIDATION,
        {"tableData": {"cells": [1, 2, 3, 5]}}
    )
    assert grid_result_invalid["is_correct"] == False
    
    # Test math validation
    math_result = execute_validation_function(
        MATH_VALIDATION,
        {"submission": 12}
    )
    assert math_result["is_correct"] == True
    
    math_result_invalid = execute_validation_function(
        MATH_VALIDATION,
        {"submission": 10}
    )
    assert math_result_invalid["is_correct"] == False
    
    # Test logic validation
    logic_result = execute_validation_function(
        LOGIC_VALIDATION,
        {"submission": "32"}
    )
    assert logic_result["is_correct"] == True
    
    logic_result_invalid = execute_validation_function(
        LOGIC_VALIDATION,
        {"submission": "64"}
    )
    assert logic_result_invalid["is_correct"] == False


def test_validate_function():
    """Test validate_function"""
    # Test math validation
    test_cases = [
        {"submission": 12},
        {"submission": 10},
        {"submission": None}
    ]
    expected_outcomes = [True, False, False]
    
    results = validate_function(
        MATH_PROBLEM, MATH_VALIDATION, test_cases, expected_outcomes
    )
    
    assert "accuracy_score" in results
    assert results["accuracy_score"] > 0
    assert "false_positive_count" in results
    assert "false_negative_count" in results
    assert "confidence_level" in results


if __name__ == "__main__":
    # Run tests
    print("Testing execute_validation_function...")
    test_execute_validation_function()
    print("✅ execute_validation_function tests passed")
    
    print("Testing validate_function...")
    test_validate_function()
    print("✅ validate_function tests passed")
    
    print("All tests completed!")