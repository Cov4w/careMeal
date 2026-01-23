import os
import shutil
from dotenv import load_dotenv
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import DirectoryLoader, PyMuPDFLoader, TextLoader, CSVLoader, UnstructuredExcelLoader, BSHTMLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 환경 변수 로드
load_dotenv()

def ingest_data():
    persist_directory = "./chroma_db"
    data_directory = "./data"

    print("🚀 [Ingest] 데이터 학습 및 벡터 DB 생성 작업을 시작합니다.")
    
    # 0. 기존 DB 삭제 (Warning: 완전 재학습)
    if os.path.exists(persist_directory):
        print(f"🗑️ 기존 DB({persist_directory})를 삭제하고 새로 생성합니다...")
        shutil.rmtree(persist_directory)

    print("Start Loading Embeddings Model...")
    embeddings = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sbert-nli"
    )
    
    if not os.path.exists(data_directory):
        print(f"⚠️ '{data_directory}' 폴더가 없습니다. 폴더를 생성하고 문서를 넣어주세요.")
        os.makedirs(data_directory)
        return

    documents = []
    
    # 2. 문서 로더 설정
    loaders = [
        ("PDF", DirectoryLoader(data_directory, glob="**/*.pdf", loader_cls=PyMuPDFLoader, silent_errors=True)),
        ("Text", DirectoryLoader(data_directory, glob="**/*.txt", loader_cls=TextLoader, silent_errors=True)),
        ("CSV", DirectoryLoader(data_directory, glob="**/*.csv", loader_cls=CSVLoader, silent_errors=True)),
        ("Excel", DirectoryLoader(data_directory, glob="**/*.xlsx", loader_cls=UnstructuredExcelLoader, silent_errors=True)),
        ("HTML", DirectoryLoader(data_directory, glob="**/*.html", loader_cls=BSHTMLLoader, silent_errors=True)),
    ]
    
    for name, loader in loaders:
        try:
            print(f"📚 Reading {name} files...")
            docs = loader.load()
            print(f"  - {len(docs)} {name} documents loaded.")
            documents.extend(docs)
        except Exception as e:
            print(f"⚠️ {name} 로딩 중 에러 (건너뜀): {e}")

    # 3. 청킹 및 저장
    if documents:
        print(f"📄 총 {len(documents)}개의 문서를 로드했습니다. 청킹 작업을 시작합니다.")
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
        splits = text_splitter.split_documents(documents)
        
        print(f"🧩 {len(splits)}개의 청크로 분할되었습니다. 벡터 DB 저장을 시작합니다...")
        
        vector_store = Chroma.from_documents(
            documents=splits, 
            embedding=embeddings, 
            persist_directory=persist_directory
        )
        print(f"💾 벡터 DB 저장 완료! ({persist_directory})")
        print("✅ 이제 'python main.py' (uvicorn)를 실행하면 업데이트된 데이터를 사용할 수 있습니다.")
    else:
        print("⚠️ 로드된 문서가 없습니다. data 폴더를 확인해주세요.")

if __name__ == "__main__":
    ingest_data()
