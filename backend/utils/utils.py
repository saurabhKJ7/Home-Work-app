from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import anthropic
from dotenv import load_dotenv
from pinecone import Pinecone
import os
load_dotenv()


os.environ["ANTHROPIC_API_KEY"] = os.getenv("ANTHROPIC_API_KEY")


llm=anthropic.Anthropic(model="claude-3-7-sonnet-20250219")

def get_index():
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index_name = "home-work"
    return pc.Index(index_name)

def generate_validation(activity: str):
    prompt=PromptTemplate(
        input_variables=["activity"],
        template="""
        You are a helpful assistant that generates a validation function for an activity.
        """
    )
    chain=LLMChain(llm=llm,prompt=prompt)
    return chain.run(activity)


def validate_answer(answer: str, code: str):
    
    #get the answer from the user. And use those inputs to run the code. And if the input and answer is correct, return true, else return false.

    pass



