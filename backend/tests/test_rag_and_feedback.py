"""
Test RAG system and feedback generator
"""
import pytest
import sys
import os
from pathlib import Path

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from src.feedback_generator import generate_feedback, add_activity_specific_guidance

def test_filter_by_activity_type():
    """Test filter_by_activity_type function"""
    # Import here to avoid import errors
    from src.improved_rag import filter_by_activity_type
    
    # Create sample examples
    examples = [
        {
            "prompt": "Create a grid where all cells contain odd numbers.",
            "question": "Is this grid valid?",
            "code": "function test() { return true; }",
            "weight": 0.9
        },
        {
            "prompt": "What is the sum of 5 and 7?",
            "question": "Calculate the sum.",
            "code": "function test() { return 12; }",
            "weight": 0.8
        },
        {
            "prompt": "What comes next in the sequence: 2, 4, 8, 16?",
            "question": "Find the pattern.",
            "code": "function test() { return 32; }",
            "weight": 0.7
        }
    ]
    
    # Test grid filtering
    grid_filtered = filter_by_activity_type(examples, "Grid-based")
    assert len(grid_filtered) >= 1
    assert any("grid" in ex.get("prompt", "").lower() for ex in grid_filtered)
    
    # Test math filtering
    math_filtered = filter_by_activity_type(examples, "Mathematical")
    assert len(math_filtered) >= 1
    assert any("sum" in ex.get("prompt", "").lower() for ex in math_filtered)
    
    # Test logic filtering
    logic_filtered = filter_by_activity_type(examples, "Logical")
    assert len(logic_filtered) >= 1
    assert any("sequence" in ex.get("prompt", "").lower() for ex in logic_filtered)
    
    # Test unknown type (should return all examples)
    unknown_filtered = filter_by_activity_type(examples, "Unknown")
    assert len(unknown_filtered) == len(examples)


def test_generate_feedback():
    """Test generate_feedback function"""
    # Test correct answer feedback
    correct_feedback = generate_feedback(
        is_correct=True,
        prompt="What is 5 + 7?",
        submission=12,
        attempt_number=1,
        activity_type="Mathematical"
    )
    
    assert "tableStartSound" in correct_feedback
    assert "tableEndSound" in correct_feedback
    assert "tableEndText" in correct_feedback
    assert "tableEndSticker" in correct_feedback
    assert correct_feedback["tableStartSound"] == "success"
    assert "first try" in correct_feedback["tableEndText"].lower()
    
    # Test incorrect answer feedback
    incorrect_feedback = generate_feedback(
        is_correct=False,
        prompt="What is 5 + 7?",
        submission=10,
        attempt_number=2,
        activity_type="Mathematical"
    )
    
    assert "tableStartSound" in incorrect_feedback
    assert "tableEndSound" in incorrect_feedback
    assert "tableEndText" in incorrect_feedback
    assert "tableEndSticker" in incorrect_feedback
    assert incorrect_feedback["tableStartSound"] == "incorrect"
    assert "calculations" in incorrect_feedback["tableEndText"].lower()


def test_add_activity_specific_guidance():
    """Test add_activity_specific_guidance function"""
    # Test grid guidance
    grid_guidance = add_activity_specific_guidance(
        "Base feedback",
        "Grid-based",
        False,
        2
    )
    assert "grid patterns" in grid_guidance.lower()
    
    # Test math guidance
    math_guidance = add_activity_specific_guidance(
        "Base feedback",
        "Mathematical",
        False,
        2
    )
    assert "calculations" in math_guidance.lower()
    
    # Test logic guidance
    logic_guidance = add_activity_specific_guidance(
        "Base feedback",
        "Logical",
        False,
        2
    )
    assert "logical sequence" in logic_guidance.lower()
    
    # Test correct answer (should return base feedback)
    correct_guidance = add_activity_specific_guidance(
        "Base feedback",
        "Mathematical",
        True,
        2
    )
    assert correct_guidance == "Base feedback"
    
    # Test first attempt (should return base feedback)
    first_attempt_guidance = add_activity_specific_guidance(
        "Base feedback",
        "Mathematical",
        False,
        1
    )
    assert first_attempt_guidance == "Base feedback"


if __name__ == "__main__":
    # Run tests
    print("Testing filter_by_activity_type...")
    test_filter_by_activity_type()
    print("✅ filter_by_activity_type tests passed")
    
    print("Testing generate_feedback...")
    test_generate_feedback()
    print("✅ generate_feedback tests passed")
    
    print("Testing add_activity_specific_guidance...")
    test_add_activity_specific_guidance()
    print("✅ add_activity_specific_guidance tests passed")
    
    print("All tests completed!")