"""
Update Pinecone with text-to-function data from CSV/Excel
"""
import os
import pandas as pd
import json
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone
from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

# Define paths
EXCEL_PATH = os.path.join(os.path.dirname(__file__), "../text-to-function(evaluation).xlsx")
INDEX_NAME = "home-work"

def read_excel_data(file_path: str) -> pd.DataFrame:
    """
    Read data from Excel file
    
    Args:
        file_path: Path to Excel file
        
    Returns:
        DataFrame with data
    """
    print(f"Reading data from {file_path}...")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Excel file not found at {file_path}")
    
    df = pd.read_excel(file_path)
    
    # Check required columns
    required_columns = ["Prompt"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        raise ValueError(f"Excel file missing required columns: {missing_columns}")
    
    print(f"Read {len(df)} rows from Excel file")
    return df

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for texts
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of embeddings
    """
    print(f"Generating embeddings for {len(texts)} texts...")
    
    embedder = OpenAIEmbeddings()
    embeddings = embedder.embed_documents(texts)
    
    print(f"Generated {len(embeddings)} embeddings")
    return embeddings

def update_pinecone(texts: List[str], codes: List[str], embeddings: List[List[float]]) -> None:
    """
    Update Pinecone with text-to-function data
    
    Args:
        texts: List of prompt texts
        codes: List of code strings
        embeddings: List of embeddings
    """
    print(f"Updating Pinecone index '{INDEX_NAME}'...")
    
    # Initialize Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    
    # Check if index exists
    if not pc.has_index(INDEX_NAME):
        print(f"Creating new index '{INDEX_NAME}'...")
        pc.create_index_for_model(
            name=INDEX_NAME,
            cloud="aws",
            region="us-east-1",
        )
    
    # Get index
    index = pc.Index(INDEX_NAME)
    
    # Prepare items for upsert
    items = [
        (str(i), emb, {"text": txt, "code": code, "question": txt})
        for i, (emb, txt, code) in enumerate(zip(embeddings, texts, codes))
    ]
    
    # Upsert in batches
    batch_size = 100
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        ids = [item[0] for item in batch]
        vectors = [item[1] for item in batch]
        metadatas = [item[2] for item in batch]
        
        index.upsert(vectors=[(id, vec, meta) for id, vec, meta in zip(ids, vectors, metadatas)])
        print(f"Upserted batch {i//batch_size + 1}/{(len(items)-1)//batch_size + 1}")
    
    # Get index stats
    stats = index.describe_index_stats()
    print(f"Index now has {stats['total_vector_count']} vectors")

def main():
    """Main function to update Pinecone"""
    try:
        # Read data from Excel
        df = read_excel_data(EXCEL_PATH)
        
        # Extract prompts and codes
        prompts = df["Prompt"].dropna().tolist()
        
        # If there's a Code column, use it; otherwise, use empty strings
        if "Code" in df.columns:
            codes = df["Code"].fillna("").tolist()
        else:
            codes = [""] * len(prompts)
        
        # Generate embeddings
        embeddings = generate_embeddings(prompts)
        
        # Update Pinecone
        update_pinecone(prompts, codes, embeddings)
        
        print("Successfully updated Pinecone!")
        
    except Exception as e:
        print(f"Error updating Pinecone: {str(e)}")

if __name__ == "__main__":
    main()
