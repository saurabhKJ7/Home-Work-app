/**
 * Client-side validation service
 */

interface ValidationResult {
  is_correct: boolean;
  feedback: string;
  confidence_score: number;
  metadata?: Record<string, any>;
}

interface ValidationParams {
  submission: any;
  global_context_variables?: Record<string, any>;
}

export class ValidationService {
  /**
   * Execute a validation function safely in the browser
   */
  static executeValidation(
    validationFunction: string,
    params: ValidationParams
  ): ValidationResult {
    try {
      // Create a safe execution context
      const validateFn = new Function('params', validationFunction);
      
      // Execute the validation function
      const result = validateFn(params);
      
      // Ensure the result matches our expected format
      return {
        is_correct: Boolean(result?.is_correct),
        feedback: String(result?.feedback || ''),
        confidence_score: Number(result?.confidence_score || 0),
        metadata: result?.metadata || {}
      };
    } catch (error) {
      console.error('Validation execution error:', error);
      return {
        is_correct: false,
        feedback: 'There was an error validating your answer. Please try again.',
        confidence_score: 0,
        metadata: { error: String(error) }
      };
    }
  }
}

export interface Activity {
  id: string;
  title: string;
  worksheetLevel: string;
  type: 'Grid-based' | 'Mathematical' | 'Logical';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  problemStatement: string;
  createdAt: string;
  userId?: string;
  validation_function?: string;
  ui_config?: Record<string, any>;
}
