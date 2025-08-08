def get_code_generation_template() -> str:
    return (
        """
You are an expert JavaScript developer.

Below are examples of user prompts and the corresponding JavaScript function code:

{rag_data}

Now, given the following user prompt, generate the JavaScript function code that fulfills the request.

USER PROMPT:
{user_prompt}

Return only the JavaScript function code.
"""
    )


def get_feedback_template() -> str:
    return (
        """
You are an expert programming tutor.

Below is a user prompt describing a function to implement:
USER PROMPT:
{original_prompt}

Here is the JavaScript function generated:
GENERATED FUNCTION:
{generated_function}

Here are the test cases and their expected outcomes:
{test_cases_and_outcomes}

Please review the generated function. Analyze if it correctly implements the user prompt and passes all the test cases. 
Return a JSON with:
1. is_correct: boolean (true if the function is correct)
2. feedback: string (constructive feedback or suggestions for improvement)
3. confidence_score: float between 0 and 1
"""
    )


