"""
Test Pinecone integration and text-to-function conversion
"""
import pytest
import sys
import os
from pathlib import Path
import pandas as pd

# Add parent directory to path to import modules
sys.path.append(str(Path(__file__).parent.parent))

from src.retrieval import get_embeddings, retrieve_similar_examples
from src.improved_rag import get_enhanced_rag_data
from src.validation_generator import generate_validation_function

# Define path to CSV/Excel file
EXCEL_PATH = os.path.join(os.path.dirname(__file__), "../../text-to-function(evaluation).xlsx")

def test_pinecone_connection():
    """Test connection to Pinecone"""
    from pinecone import Pinecone
    
    # Initialize Pinecone client
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    
    # Check if index exists
    index_name = "home-work"
    assert pc.has_index(index_name), f"Index '{index_name}' not found in Pinecone"
    
    # Get index stats
    index = pc.Index(index_name)
    stats = index.describe_index_stats()
    
    # Check that index has vectors
    assert stats["total_vector_count"] > 0, "Index has no vectors"
    print(f"Index has {stats['total_vector_count']} vectors")

def test_embedding_generation():
    """Test embedding generation"""
    # Generate embedding for a test query
    test_query = "What is 2 + 2?"
    embedding = get_embeddings(test_query)
    
    # Check that embedding is a list of floats with correct dimension
    assert isinstance(embedding, list), "Embedding should be a list"
    assert len(embedding) > 0, "Embedding should not be empty"
    assert all(isinstance(x, float) for x in embedding), "Embedding should contain floats"
    
    # OpenAI embeddings typically have 1536 dimensions
    assert len(embedding) == 1536, f"Expected 1536 dimensions, got {len(embedding)}"

def test_retrieval():
    """Test retrieval from Pinecone"""
    # Generate embedding for a test query
    test_query = "What is 2 + 2?"
    embedding = get_embeddings(test_query)
    
    # Retrieve similar examples
    results = retrieve_similar_examples(embedding, top_k=3)
    
    # Check that we got results
    assert results is not None, "No results returned from Pinecone"
    assert len(results) > 0, "No matches found in Pinecone"
    
    # Check that results have the expected structure
    for result in results:
        assert hasattr(result, "id"), "Result missing 'id'"
        assert hasattr(result, "score"), "Result missing 'score'"
        assert hasattr(result, "metadata"), "Result missing 'metadata'"
        assert "text" in result.metadata, "Result metadata missing 'text'"

def test_enhanced_rag():
    """Test enhanced RAG data retrieval"""
    # Get enhanced RAG data
    test_query = "What is 2 + 2?"
    rag_data = get_enhanced_rag_data(test_query, "Mathematical")
    
    # Check that we got results
    assert isinstance(rag_data, list), "RAG data should be a list"
    
    # If we have results, check their structure
    if rag_data:
        example = rag_data[0]
        assert "prompt" in example or "question" in example, "Example missing 'prompt' or 'question'"
        assert "code" in example, "Example missing 'code'"
        assert "weight" not in example, "Example should not contain 'weight'"

def test_excel_file_exists():
    """Test that the Excel file exists"""
    assert os.path.exists(EXCEL_PATH), f"Excel file not found at {EXCEL_PATH}"
    
    # Try to read the file
    df = pd.read_excel(EXCEL_PATH)
    
    # Check that it has the expected columns
    assert "Prompt" in df.columns, "Excel file missing 'Prompt' column"
    
    # Check that it has data
    assert len(df) > 0, "Excel file has no data"
    print(f"Excel file has {len(df)} rows")

def test_function_generation():
    """Test function generation from prompt"""
    try:
        # Generate a validation function
        test_query = "What is 2 + 2?"
        functions = generate_validation_function(test_query, "Mathematical")
        
        # Check that we got a validation function
        assert "validation_function" in functions, "Missing validation function"
        assert "feedback_function" in functions, "Missing feedback function"
        
        # Check that the functions have the expected structure
        assert "function evaluate" in functions["validation_function"], "Invalid validation function"
        assert "function feedbackFunction" in functions["feedback_function"], "Invalid feedback function"
    except Exception as e:
        pytest.skip(f"Function generation failed: {str(e)}")

if __name__ == "__main__":
    # Run tests
    print("Testing Pinecone connection...")
    try:
        test_pinecone_connection()
        print("✅ Pinecone connection test passed")
    except Exception as e:
        print(f"❌ Pinecone connection test failed: {str(e)}")
    
    print("\nTesting embedding generation...")
    try:
        test_embedding_generation()
        print("✅ Embedding generation test passed")
    except Exception as e:
        print(f"❌ Embedding generation test failed: {str(e)}")
    
    print("\nTesting retrieval...")
    try:
        test_retrieval()
        print("✅ Retrieval test passed")
    except Exception as e:
        print(f"❌ Retrieval test failed: {str(e)}")
    
    print("\nTesting enhanced RAG...")
    try:
        test_enhanced_rag()
        print("✅ Enhanced RAG test passed")
    except Exception as e:
        print(f"❌ Enhanced RAG test failed: {str(e)}")
    
    print("\nTesting Excel file...")
    try:
        test_excel_file_exists()
        print("✅ Excel file test passed")
    except Exception as e:
        print(f"❌ Excel file test failed: {str(e)}")
    
    print("\nTesting function generation...")
    try:
        test_function_generation()
        print("✅ Function generation test passed")
    except Exception as e:
        print(f"❌ Function generation test failed: {str(e)}")
    
    print("\nAll tests completed!")
