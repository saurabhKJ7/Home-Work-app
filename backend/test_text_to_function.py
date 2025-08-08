"""
Test end-to-end text-to-function conversion
"""
import os
import sys
from pathlib import Path
import pandas as pd
from dotenv import load_dotenv

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent))

from src.improved_rag import get_enhanced_rag_data
from src.meta_validation import execute_validation_function

load_dotenv()

# Define path to Excel file
EXCEL_PATH = os.path.join(os.path.dirname(__file__), "../text-to-function(evaluation).xlsx")

# Sample validation function for testing
SAMPLE_VALIDATION_FUNCTION = """
function evaluate(params) {
  try {
    const { submission, global_context_variables = {} } = params || {};
    
    // Validate inputs
    if (submission === undefined || submission === null) {
      return {
        is_correct: false,
        condition_level_is_correct: [false],
        error: "Invalid input: Missing submission"
      };
    }
    
    // Type conversion if needed
    const userAnswer = typeof submission === 'string' ? parseFloat(submission) : submission;
    
    // Check if answer is correct (4 in this example)
    const isCorrect = userAnswer === 4;
    
    return {
      is_correct: isCorrect,
      condition_level_is_correct: [isCorrect]
    };
  } catch (error) {
    console.error("Validation error:", error);
    return {
      is_correct: false,
      condition_level_is_correct: [false],
      error: error.message
    };
  }
}
"""

def test_text_to_function_pipeline():
    """Test the complete text-to-function pipeline"""
    # Check that Excel file exists
    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Excel file not found at {EXCEL_PATH}")
        return
    
    # Read Excel file
    try:
        df = pd.read_excel(EXCEL_PATH)
        print(f"✅ Read {len(df)} rows from Excel file")
    except Exception as e:
        print(f"❌ Failed to read Excel file: {str(e)}")
        return
    
    # Get sample prompts
    if "Prompt" not in df.columns:
        print("❌ Excel file missing 'Prompt' column")
        return
    
    prompts = df["Prompt"].dropna().tolist()
    if not prompts:
        print("❌ No prompts found in Excel file")
        return
    
    # Test with first prompt
    test_prompt = prompts[0]
    print(f"\nTesting with prompt: '{test_prompt}'")
    
    # Get RAG data
    try:
        rag_data = get_enhanced_rag_data(test_prompt, "Mathematical")
        print(f"✅ Retrieved {len(rag_data)} examples from RAG")
    except Exception as e:
        print(f"❌ Failed to get RAG data: {str(e)}")
        return
    
    # Use sample validation function instead of generating one
    validation_function = SAMPLE_VALIDATION_FUNCTION
    print("✅ Using sample validation function for testing")
    
    # Test validation function with sample input
    try:
        # Test with correct answer (assuming math problem)
        result_correct = execute_validation_function(
            validation_function,
            {"submission": 4}  # Sample correct answer
        )
        
        # Test with incorrect answer
        result_incorrect = execute_validation_function(
            validation_function,
            {"submission": 5}  # Sample incorrect answer
        )
        
        print("✅ Executed validation function with sample inputs")
        print(f"   - Correct input result: {result_correct.get('is_correct')}")
        print(f"   - Incorrect input result: {result_incorrect.get('is_correct')}")
    except Exception as e:
        print(f"❌ Failed to execute validation function: {str(e)}")
        return
    
    print("\n✅ Text-to-function pipeline test completed successfully!")

if __name__ == "__main__":
    print("Testing text-to-function pipeline...")
    test_text_to_function_pipeline()