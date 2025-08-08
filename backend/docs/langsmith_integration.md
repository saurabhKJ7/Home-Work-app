# LangSmith Integration

This document describes the integration of LangSmith tracing and monitoring with the Home-Work application.

## Overview

LangSmith is a platform for debugging, testing, evaluating, and monitoring LLM applications. It provides visibility into the execution of LLM chains, helping to identify issues and optimize performance.

In the Home-Work application, LangSmith is used to:

1. Trace LLM calls for code generation and feedback
2. Monitor embedding generation and retrieval operations
3. Track API endpoint performance and errors
4. Provide debugging information for complex chains

## Configuration

LangSmith is configured using environment variables in the `.env` file:

```
LANGSMITH_TRACING="true"
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY="your-api-key"
LANGSMITH_PROJECT="Home-Work"
```

- `LANGSMITH_TRACING`: Set to "true" to enable tracing, "false" to disable
- `LANGSMITH_ENDPOINT`: The URL of the LangSmith API
- `LANGSMITH_API_KEY`: Your LangSmith API key
- `LANGSMITH_PROJECT`: The name of the project in LangSmith

## Components with LangSmith Integration

### 1. LLM Chain (llm_chain.py)

The main LLM chain functions are integrated with LangSmith:

- `init_langsmith()`: Initializes the LangSmith tracer
- `get_evaluate_function()`: Traces code generation with metadata
- `feedback_function()`: Traces feedback generation with metadata

### 2. Retrieval (retrieval.py)

Vector operations are traced:

- `get_embeddings()`: Traces embedding generation
- `retrieve_similar_examples()`: Traces vector retrieval operations

### 3. API Endpoints (main.py)

FastAPI endpoints are traced:

- `/generate-code`: Traces the entire code generation process
- `/feedback-answer`: Traces the feedback generation process

## Testing LangSmith Integration

A test script is provided to verify that LangSmith integration is working properly:

```bash
python backend/test_langsmith.py
```

This script:
1. Generates embeddings for a test query
2. Retrieves similar examples
3. Generates code using the LLM
4. Generates feedback for the code
5. Verifies that all operations are properly traced in LangSmith

## Viewing Traces

To view traces:

1. Go to [LangSmith](https://smith.langchain.com/)
2. Log in with your credentials
3. Navigate to the "Home-Work" project (or the project specified in your environment variables)
4. View traces, runs, and datasets

## Troubleshooting

If traces are not appearing in LangSmith:

1. Verify that `LANGSMITH_TRACING` is set to "true" in your `.env` file
2. Check that your `LANGSMITH_API_KEY` is valid
3. Ensure that the application has internet access to reach the LangSmith API
4. Look for error messages in the application logs
5. Try running the test script to isolate the issue

## Benefits

Using LangSmith provides several benefits:

- **Debugging**: Easily identify issues in complex LLM chains
- **Performance Monitoring**: Track response times and costs
- **Quality Assurance**: Evaluate the quality of generated outputs
- **Optimization**: Identify opportunities to improve prompts and chains

## Future Enhancements

Potential future enhancements for the LangSmith integration:

1. Add custom evaluators for code quality
2. Implement feedback loops for continuous improvement
3. Create datasets for systematic testing
4. Implement A/B testing for different prompts
5. Set up automated monitoring and alerting
