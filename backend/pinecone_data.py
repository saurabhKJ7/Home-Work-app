import os
import pandas as pd
from langchain.embeddings import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
from utils.logger import get_logger

load_dotenv()
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
logger = get_logger("pinecone_setup")

# Define the path to the Excel file
EXCEL_PATH = os.path.join(os.path.dirname(__file__), "../text-to-function(evaluation).xlsx")

def read_excel(file_path):
    df = pd.read_excel(file_path)
    prompts = df['Prompt'].dropna().tolist()
    return prompts

all_prompts = read_excel(EXCEL_PATH)

# Function to embed texts using OpenAI embeddings
def embed_texts(texts):
    embedder = OpenAIEmbeddings()
    embeddings = embedder.embed_documents([texts] if isinstance(texts, str) else texts)
    return embeddings

embeddings = embed_texts(all_prompts)
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = "home-work"

if not pc.has_index(index_name):
    pc.create_index_for_model(
        name=index_name,
        cloud="aws",
        region="us-east-1",
    )

index = pc.Index(index_name)
logger.info("Pinecone index ready: %s", index_name)

items = [
    (str(i), emb, {"text": txt})
    for i, (emb, txt) in enumerate(zip(embeddings, all_prompts))
]

for i in range(0, len(items), 100):
    batch = items[i:i+100]
    ids = [item[0] for item in batch]
    vectors = [item[1] for item in batch]
    metadatas = [item[2] for item in batch]
    index.upsert(vectors=[(id, vec, meta) for id, vec, meta in zip(ids, vectors, metadatas)])

logger.info("Indexed %d items to Pinecone", len(items))


