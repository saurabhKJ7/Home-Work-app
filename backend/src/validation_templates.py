"""
Templates for standardized validation functions
"""

# Grid-based validation template
GRID_VALIDATION_TEMPLATE = """
function evaluate(params) {
  try {
    const { tableData, global_context_variables = {} } = params || {};
    
    // Validate inputs
    if (!tableData || !tableData.cells) {
      return {
        is_correct: false,
        cell_level_is_correct: [],
        condition_level_is_correct: [false],
        error: "Invalid input: Missing tableData or cells"
      };
    }
    
    // Extract cell data
    const cells = tableData.cells;
    
    // VALIDATION_LOGIC
    
    // Default return if validation logic doesn't explicitly return
    return {
      is_correct: false,
      cell_level_is_correct: Array(cells.length).fill(false),
      condition_level_is_correct: [false]
    };
  } catch (error) {
    console.error("Validation error:", error);
    return {
      is_correct: false,
      cell_level_is_correct: [],
      condition_level_is_correct: [false],
      error: error.message
    };
  }
}
"""

# Math validation template
MATH_VALIDATION_TEMPLATE = """
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
    
    // VALIDATION_LOGIC
    
    // Default return if validation logic doesn't explicitly return
    return {
      is_correct: false,
      condition_level_is_correct: [false]
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

# Logic validation template
LOGIC_VALIDATION_TEMPLATE = """
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
    
    // VALIDATION_LOGIC
    
    // Default return if validation logic doesn't explicitly return
    return {
      is_correct: false,
      condition_level_is_correct: [false]
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

# Feedback function template
FEEDBACK_TEMPLATE = """
function feedbackFunction(params) {
  try {
    const { tableCorrectnessState, pixiData, attemptNumber = 1 } = params || {};
    
    // Default feedback
    let feedback = {
      tableStartSound: "neutral",
      tableEndSound: "neutral",
      tableEndText: "Keep trying!",
      tableEndSticker: "neutral"
    };
    
    // Check if correct
    const isCorrect = tableCorrectnessState && tableCorrectnessState.is_correct;
    
    if (isCorrect) {
      feedback.tableStartSound = "success";
      feedback.tableEndSound = "success";
      feedback.tableEndText = "Great job!";
      feedback.tableEndSticker = "success";
    } else {
      // First attempt - gentle guidance
      if (attemptNumber <= 1) {
        feedback.tableEndText = "Think about the problem carefully and try again.";
      } 
      // Middle attempts - more specific hints
      else if (attemptNumber <= 3) {
        feedback.tableEndText = "Look for patterns in the problem.";
      } 
      // Final attempts - stronger guidance
      else {
        feedback.tableEndText = "Remember the key requirements and give it another try.";
      }
    }
    
    // FEEDBACK_LOGIC
    
    return feedback;
  } catch (error) {
    console.error("Feedback error:", error);
    return {
      tableStartSound: "neutral",
      tableEndSound: "neutral",
      tableEndText: "Something went wrong. Please try again.",
      tableEndSticker: "neutral",
      error: error.message
    };
  }
}
"""