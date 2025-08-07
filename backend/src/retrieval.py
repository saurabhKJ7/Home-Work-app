import os
from pinecone import Pinecone
from typing import List, Dict, Any
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv
load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")


def get_embeddings(text: str):
    """Get embeddings for a text"""
    embeddings = OpenAIEmbeddings()
    return embeddings.embed_query(text)

def init_pinecone():
    """Initialize Pinecone client"""
    api_key = os.environ.get("PINECONE_API_KEY")
    environment = os.environ.get("PINECONE_ENVIRONMENT")
    
    if not api_key or not environment:
        raise ValueError("Pinecone API key and environment must be set")
    
    return Pinecone(api_key=api_key, environment=environment)

def get_index(index_name=None):
    """Get Pinecone index"""
    pc = init_pinecone()
    indexes = pc.list_indexes()
    index_name = index_name or os.environ.get("PINECONE_INDEX")
    
    if not index_name:
        raise ValueError("Pinecone index name must be provided")
    
    # Check if index exists by comparing names directly
    index_names = [index["name"] for index in indexes]
    if index_name not in index_names:
        raise ValueError(f"Index '{index_name}' not found in Pinecone. Available indexes: {index_names}")
    
    return pc.Index(index_name)

def retrieve_similar_examples(query_vector: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
    """Retrieve similar examples from Pinecone"""
    try:
        index = get_index()
        results = index.query(vector=query_vector, top_k=top_k, include_metadata=True)
        return results.matches
    except Exception as e:
        print(f"Error retrieving from Pinecone: {str(e)}")
        return []



if __name__ == "__main__":

    

    query = "write a function that takes two numbers and returns their sum"
    query_vector = get_embeddings(query)
    results = retrieve_similar_examples(query_vector)
    print(results)



