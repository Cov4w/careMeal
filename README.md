# CareMeal
## 프로젝트 개요
**CareMeal**은 사용자의 건강 정보와 식습관을 분석하여 맞춤형 식단 조언으로 건강관리를 돕는 **RAG 기반 AI 헬스케어 도우미**입니다.
## 주요기능
*  **개인 맞춤형 AI 상담**: 다양한 페르소나가 사용자의 연령, 건강상태, 식이에 따른 맞춤형 식단과 건강 조언을 제공합니다.
*  **식단과 연계한 건강 모니터링으로 관리**: 사용자가 섭취한 식단과 혈당 수치를 기록하고 건강 상태를 지속적으로 관리하여 모니터링할 수 있다.
*  **RAG(검색 증강 생성) 기반 정보 제공**: 검증된 의학 자료를 기반으로 학습된 데이터베이스를 활용하여 신뢰할 수 있는 건강 정보를 제공합니다.

## 기술 스택
### Backend
*   **Framework**: FastAPI (Python)
*   **AI & LLM**: Google Gemini 1.5 Flash, LangChain
*   **Database**: SQLite, ChromaDB (Vector Store)
*   **Embedding**: HuggingFace

### Frontend
*   **Framework**: React (Vite), TypeScript
*   **Styling**: TailwindCSS
*   **State Management**: Local Context & React Hooks

---

## 실행 방법

### 1. Backend 실행
```bash
# 가상 환경 활성화 (선택)
# python -m venv venv
# source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 벡터 DB 구축 (최초 1회, data 폴더에 문서 필요)
python ingest.py

# 서버 실행
uvicorn main:app --reload
```
*   API 서버: http://localhost:8000
*   Swagger 문서: http://localhost:8000/docs

### 2. Frontend 실행
```bash
cd temp
npm install
npm run dev
```

---

## 프로젝트 구조

```
careMeal/
├── main.py              # Backend 메인 서버 (All-in-One)
├── ingest.py            # RAG 데이터 전처리 및 벡터 DB 생성 스크립트
├── requirements.txt     # Python 의존성 목록
├── caremeal.db          # SQLite 데이터베이스 (자동 생성)
├── chroma_db/           # 벡터 데이터베이스 저장소
├── data/                # RAG 학습용 문서 (PDF, txt 등)
└── temp/                # Frontend 소스 코드 (React)
    ├── src/
    │   ├── components/  # UI 컴포넌트
    │   ├── services/    # API 통신 모듈
    │   └── ...
```

## 협업 가이드
1. `develop` 브랜치를 기준으로 작업합니다.
2. 기능 개발 시 `feature/기능명` 브랜치를 생성하여 작업 후 PR을 보냅니다.
3. 공유 데이터(문서 등)는 `data/` 폴더에 위치시킵니다.
