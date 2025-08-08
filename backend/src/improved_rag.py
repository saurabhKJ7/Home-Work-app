"""
Improved RAG system for better retrieval of similar validation scenarios
"""
from typing import List, Dict, Any
import numpy as np
from langchain_openai import OpenAIEmbeddings
from src.retrieval import get_embeddings, retrieve_similar_examples

def get_weighted_examples(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Get weighted examples based on similarity to query
    
    Args:
        query: The user query
        top_k: Number of examples to retrieve
        
    Returns:
        List of examples with weights
    """
    # Get embeddings for the query
    query_vector = get_embeddings(query)
    
    # Retrieve similar examples
    matches = retrieve_similar_examples(query_vector, top_k=top_k)
    
    # Add weights based on similarity scores
    weighted_examples = []
    for match in matches:
        example = {
            "prompt": match.metadata.get("text", ""),
            "question": match.metadata.get("question", ""),
            "code": match.metadata.get("code", ""),
            "weight": match.score  # Similarity score
        }
        weighted_examples.append(example)
    
    return weighted_examples

def filter_by_activity_type(examples: List[Dict[str, Any]], activity_type: str) -> List[Dict[str, Any]]:
    """
    Filter examples by activity type
    
    Args:
        examples: List of examples
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        
    Returns:
        Filtered list of examples
    """
    # Keywords associated with each activity type
    type_keywords = {
        "Grid-based": ["grid", "cell", "table", "sudoku", "matrix"],
        "Mathematical": ["math", "equation", "solve", "calculate", "number"],
        "Logical": ["logic", "sequence", "pattern", "reasoning", "condition"]
    }
    
    keywords = type_keywords.get(activity_type, [])
    if not keywords:
        return examples  # No filtering if activity type is unknown
    
    # Filter examples that contain keywords in prompt or question
    filtered = []
    for example in examples:
        text = (example.get("prompt", "") + " " + example.get("question", "")).lower()
        if any(keyword in text for keyword in keywords):
            filtered.append(example)
    
    # If filtering removed all examples, return original list
    return filtered if filtered else examples

def get_enhanced_rag_data(query: str, activity_type: str = None) -> List[Dict[str, Any]]:
    """
    Get enhanced RAG data with improved retrieval
    
    Args:
        query: The user query
        activity_type: Type of activity (Grid-based, Mathematical, Logical)
        
    Returns:
        List of examples for RAG
    """
    # Get weighted examples
    examples = get_weighted_examples(query, top_k=5)
    
    # Filter by activity type if provided
    if activity_type:
        examples = filter_by_activity_type(examples, activity_type)
    
    # Sort by weight (similarity score)
    examples.sort(key=lambda x: x.get("weight", 0), reverse=True)
    
    # Remove weight field before returning
    for example in examples:
        example.pop("weight", None)
    
    return examples