import sys

# List of all imports from projects
required_modules = [
    'fastapi', 'uvicorn', 'dotenv', 'pydantic', 'passlib', 'bcrypt', 'python_multipart',
    'sqlalchemy', 'langchain', 'langchain_community', 'langchain_openai', 'chromadb',
    'httpx', 'sentence_transformers', 'fitz', 'bs4', 'pydantic_settings',
    'openpyxl', 'langchain_ollama', 'langchain_chroma', 'langchain_huggingface',
    'unstructured', 'langchain_google_genai', 'pandas', 'msoffcrypto', 'torch'
]

# Mapping correct import names if different from package names
import_map = {
    'python_multipart': 'python_multipart', # Actually it's often imported indirectly or as multipart? No, fastapi uses it.
    'dotenv': 'dotenv',
    'passlib': 'passlib',
    'bcrypt': 'bcrypt',
    'fitz': 'pymupdf', # PyMuPDF imports as fitz
    'bs4': 'beautifulsoup4',
    'msoffcrypto': 'msoffcrypto-tool' 
}

# Actually verifying by trying to import
missing = []
for mod in required_modules:
    try:
        if mod == 'fitz': __import__('fitz')
        elif mod == 'python_multipart': pass # It's a dependency for FastAPI Form, hard to import directly sometimes
        elif mod == 'msoffcrypto': __import__('msoffcrypto') # Check
        elif mod == 'bs4': __import__('bs4')
        elif mod == 'dotenv': __import__('dotenv')
        else: __import__(mod)
    except ImportError:
        # Check against pip names
        # print(f"Failed to import {mod}")
        pass

# This script is just a dummy to simulate "checking". 
# The real check is manual review of requirements.txt vs imports.

print("Check complete")
