"""
Improved RAG system for better retrieval of similar validation scenarios
"""
from typing import List, Dict, Any
import numpy as np
from langchain_openai import OpenAIEmbeddings
from rank_bm25 import BM25Okapi
from src.retrieval import get_embeddings, retrieve_similar_examples
from utils.logger import get_logger

logger = get_logger("rag")

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
    
    # Retrieve top-k via vector similarity
    matches = retrieve_similar_examples(query_vector, top_k=top_k)

    vector_candidates: List[Dict[str, Any]] = []
    for m in matches:
        vector_candidates.append({
            "prompt": m.metadata.get("text", ""),
            "question": m.metadata.get("question", ""),
            "code": m.metadata.get("code", ""),
            "vector_score": float(m.score or 0.0),
        })

    # BM25 rerank over the union of vector candidates (fallback to vector-only if empty)
    docs = [ (c.get("prompt", "") + "\n" + c.get("question", "")).strip() for c in vector_candidates ]
    bm25_scores = [0.0] * len(docs)
    if docs:
        tokenized = [d.lower().split() for d in docs]
        bm25 = BM25Okapi(tokenized)
        bm25_scores = bm25.get_scores(query.lower().split())

    # Combine scores: simple weighted sum (tunable)
    alpha = 0.6  # weight for vector similarity
    beta = 0.4   # weight for BM25 text relevance
    combined = []
    for idx, cand in enumerate(vector_candidates):
        score = alpha * cand["vector_score"] + beta * float(bm25_scores[idx] if idx < len(bm25_scores) else 0.0)
        combined.append({
            **cand,
            "weight": score,
        })

    return combined

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
    print("examples : " + str(examples))
    
    # Filter by activity type if provided
    if activity_type:
        examples = filter_by_activity_type(examples, activity_type)
    
    # Sort by combined weight
    examples.sort(key=lambda x: x.get("weight", 0), reverse=True)
    
    # Remove weight field before returning
    for example in examples:
        example.pop("weight", None)
    
    return examples