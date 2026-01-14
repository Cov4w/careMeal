from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from datetime import datetime
import uuid
import json
import base64
import os
from dotenv import load_dotenv

# --- [NEW] Local AI & Database Stack & RAG ---
from sqlalchemy import create_engine, Column, String, Integer, JSON, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# from langchain_community.chat_models import ChatOllama # [Ollama 제거]
from langchain_google_genai import ChatGoogleGenerativeAI # [Gemini 추가]
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# 환경 변수 로드
load_dotenv()

# 1. 앱 생성 및 설정
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. SQLite 데이터베이스 설정
DATABASE_URL = "sqlite:///./caremeal.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 3. DB 모델 정의
class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, index=True)
    password = Column(String)
    name = Column(String)
    age = Column(Integer)
    diabetes_type = Column(String)
    details = Column(JSON, default={})
    joined_at = Column(DateTime, default=datetime.now)

class ChatLog(Base):
    __tablename__ = "chat_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    role = Column(String) # user or ai
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.now)

class MealRecord(Base):
    __tablename__ = "meal_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    date = Column(String, index=True) # YYYY-MM-DD
    meal_type = Column(String) # breakfast, lunch, dinner, snack
    menu = Column(String)
    calories = Column(Integer)
    carbs = Column(Integer)
    protein = Column(Integer)
    fat = Column(Integer)
    image_url = Column(String, nullable=True)

class HealthRecord(Base):
    __tablename__ = "health_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    date = Column(String, index=True)
    time_slot = Column(String) # fasting, post_morning, post_lunch...
    value = Column(Integer) # 혈당 수치

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

# DB 세션 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 4. LangChain (Gemini & RAG) 설정
# GOOGLE_API_KEY는 .env 파일에서 자동으로 로드됩니다.

# 4-1. LLM 초기화 (Gemini 1.5 Flash)
llm_text = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)
llm_vision = ChatGoogleGenerativeAI(model="gemini-robotics-er-1.5-preview", temperature=0.2)
llm_agent = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.5)

# 4-2. RAG 시스템 변수 (전역)
vector_store = None
retriever = None

@app.on_event("startup")
async def startup_event():
    global vector_store, retriever
    print("🚀 [Startup] RAG 시스템 초기화 중...")
    
    # 1. 임베딩 모델 로드 (로컬 CPU)
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    
    persist_directory = "./chroma_db"
    
    # 2. 벡터 DB 로드 (DB가 있어야만 함)
    if os.path.exists(persist_directory) and os.listdir(persist_directory):
        print(f"📦 기존 벡터 DB를 로드합니다: {persist_directory}")
        vector_store = Chroma(persist_directory=persist_directory, embedding_function=embeddings)
        
        # 3. Retriever 설정
        retriever = vector_store.as_retriever(search_kwargs={"k": 3})
        print("✅ RAG 시스템 준비 완료!")
    else:
        print("⚠️ 벡터 DB가 존재하지 않습니다.")
        print("🚨 RAG 기능이 비활성화됩니다.")
        print("💡 터미널에서 'python ingest.py'를 실행하여 데이터를 먼저 학습시켜 주세요.")
        retriever = None

# 5. 데이터 구조 (Pydantic)
from typing import Any, Optional, Union

class ChatRequest(BaseModel):
    user_message: str
    user_id: str = "guest"

class SignUpRequest(BaseModel):
    user_id: str
    password: str
    name: str
    age: Union[int, str] # 프론트에서 문자열로 올 수도 있음
    diabetes_type: str
    details: Optional[Any] = {} # 어떤 데이터든 허용

class LoginRequest(BaseModel):
    user_id: str
    password: str

class MealItem(BaseModel):
    menu: str
    calories: int
    carbs: int
    protein: int
    fat: int

class DailyRecordRequest(BaseModel):
    user_id: str
    date: str
    meals: dict[str, MealItem] # key: breakfast, lunch, dinner
    blood_sugar: dict[str, int] # key: fasting, postBreakfast...

# 6. 헬퍼 함수: 페르소나 (말투 강화)
def get_persona_by_age(age, diabetes_type="일반"):
    disease_context = f"환자는 현재 '{diabetes_type}' 진단을 받은 상태입니다."
    base_persona = ""
    # 나이대별 말투를 아주 구체적으로 지시
    if 10 <= age <= 29:
        base_persona = """
        [Role: 열정적인 헬스 트레이너 PT쌤]
        - 말투: "회원님! ~하셨네요! 🔥", "~하는 게 좋아요! 💪" 처럼 에너지가 넘치는 '해요체'를 쓰세요.
        - 특징: 문장 끝마다 이모지(🔥, 💪, 🥗, 👍)를 적극적으로 붙이세요. 동기 부여를 팍팍 해주세요.
        """
    elif 30 <= age <= 49:
        base_persona = """
        [Role: 냉철하지만 따뜻한 의사 김닥터]
        - 말투: "~입니다.", "~합니다." 처럼 정중하고 신뢰감 있는 '하십시오체'를 쓰세요.
        - 특징: 전문적인 내용을 쉽게 풀어서 설명하되, 과한 이모지는 자제하고 단호하면서도 따뜻하게 조언하세요.
        """
    elif 50 <= age <= 69:
        base_persona = """
        [Role: 꼼꼼하고 친근한 임상 영양사]
        - 말투: "~했군요~", "~하면 좋아요." 처럼 부드럽고 나긋나긋한 '해요체'를 쓰세요.
        - 특징: 어려운 의학 용어 대신 쉬운 비유를 사용하고, 소화가 잘 되는지 걱정해주는 멘트를 섞으세요.
        """
    else:
        base_persona = """
        [Role: 베테랑 간호사 선생님]
        - 말투: "어르신, ~하셨어요?", "~드시면 좋습니다." 처럼 아주 예의 바르고 천천히 말하는 '존댓말'을 쓰세요.
        - 특징: 중요한 내용은 한 번 더 강조해주고, 건강을 챙겨드리는 손녀/손자 같은 마음으로 따뜻하게 대하세요.
        """
    
    return f"{base_persona}\n{disease_context}\n레시피가 필요해 보이면 답변 끝에 '[[CUSTOM_DIET_LINK]]'를 붙이세요."

# 7. API 엔드포인트

@app.post("/signup")
async def signup_endpoint(request: SignUpRequest, db: Session = Depends(get_db)):
    print(f"📝 회원가입 요청: {request.user_id}")
    existing_user = db.query(User).filter(User.user_id == request.user_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    
    new_user = User(
        user_id=request.user_id,
        password=request.password,
        name=request.name,
        age=int(request.age), # 문자열일 경우 숫자로 변환
        diabetes_type=request.diabetes_type,
        details=request.details or {}
    )
    db.add(new_user)
    db.commit()
    return {"status": "success", "message": "회원가입 완료"}

@app.post("/login")
async def login_endpoint(request: LoginRequest, db: Session = Depends(get_db)):
    print(f"🔑 로그인 요청: {request.user_id}")
    user = db.query(User).filter(User.user_id == request.user_id).first()
    if not user or user.password != request.password:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다.")
    
    return {
        "status": "success",
        "message": "로그인 성공",
        "data": {
            "name": user.name,
            "age": user.age,
            "diabetes_type": user.diabetes_type,
            "conditions": [user.diabetes_type],
            **user.details # 상세 정보 병합
        }
    }

@app.get("/records/{user_id}")
def get_records(user_id: str, date: str, db: Session = Depends(get_db)):
    # 1. 식단 조회
    meals = db.query(MealRecord).filter(
        MealRecord.user_id == user_id, 
        MealRecord.date == date
    ).all()
    
    # 2. 혈당 조회
    health = db.query(HealthRecord).filter(
        HealthRecord.user_id == user_id, 
        HealthRecord.date == date
    ).all()
    
    return {
        "date": date,
        "meals": {m.meal_type: {"menu": m.menu, "calories": m.calories, "carbs": m.carbs, "protein": m.protein, "fat": m.fat} for m in meals},
        "blood_sugar": {h.time_slot: h.value for h in health}
    }

@app.post("/records")
def save_records(req: DailyRecordRequest, db: Session = Depends(get_db)):
    # 기존 데이터 삭제 (해당 날짜 덮어쓰기 전략 - 간단구현)
    db.query(MealRecord).filter(MealRecord.user_id == req.user_id, MealRecord.date == req.date).delete()
    db.query(HealthRecord).filter(HealthRecord.user_id == req.user_id, HealthRecord.date == req.date).delete()
    
    # 식단 저장
    for m_type, item in req.meals.items():
        if item.menu: # 메뉴가 있을 때만
            db.add(MealRecord(
                user_id=req.user_id, date=req.date, meal_type=m_type,
                menu=item.menu, calories=item.calories, carbs=item.carbs, protein=item.protein, fat=item.fat
            ))
            
    # 혈당 저장
    for h_type, val in req.blood_sugar.items():
        if val > 0:
            db.add(HealthRecord(user_id=req.user_id, date=req.date, time_slot=h_type, value=val))
            
    db.commit()
    return {"status": "success"}

# 헬퍼 함수: DB에서 사용자 정보 가져오기
def get_user_profile_db(user_id: str, db: Session):
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        return {
            "name": user.name,
            "age": user.age,
            "diabetes_type": user.diabetes_type,
            "details": user.details
        }
    return None

# 헬퍼 함수: 오늘 식단/혈당 가져오기 (AI용)
def get_today_health_summary(user_id: str, db: Session):
    today = datetime.now().strftime("%Y-%m-%d")
    meals = db.query(MealRecord).filter(MealRecord.user_id == user_id, MealRecord.date == today).all()
    health = db.query(HealthRecord).filter(HealthRecord.user_id == user_id, HealthRecord.date == today).all()
    
    summary = f"[오늘({today}) 건강 기록]\n"
    if meals:
        summary += "- 식단:\n" + "\n".join([f"  * {m.meal_type}: {m.menu} ({m.calories}kcal)" for m in meals]) + "\n"
    else:
        summary += "- 식단: 기록 없음\n"
        
    if health:
        summary += "- 혈당:\n" + "\n".join([f"  * {h.time_slot}: {h.value}" for h in health]) + "\n"
    else:
        summary += "- 혈당: 기록 없음\n"
        
    return summary

@app.post("/chat")
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    print(f"📩 채팅 요청: {request.user_message}")
    
    # 1. 유저 정보 조회
    user = db.query(User).filter(User.user_id == request.user_id).first()
    persona = "친절한 의료 AI"
    user_info = "정보 없음"
    
    if user:
        persona = get_persona_by_age(user.age, user.diabetes_type)
        user_info = f"이름: {user.name}, 나이: {user.age}, 보유 질환: {user.diabetes_type}"

    # 2. RAG 검색 (문서 조회)
    context_text = ""
    sources = []
    
    if retriever:
        try:
            docs = retriever.invoke(request.user_message)
            context_text = "\n\n".join([doc.page_content for doc in docs])
            sources = list(set([os.path.basename(doc.metadata.get("source", "문서")) for doc in docs]))
            print(f"📚 검색된 문서: {sources}")
        except Exception as e:
            print(f"⚠️ 검색 중 오류 발생: {e}")
            
    # 3. 시스템 프롬프트 구성 (RAG Context 주입 + 구조화 + 초간결화 + 시간/기록 추적)
    current_time_str = datetime.now().strftime("%Y년 %m월 %d일 %H시 %M분")
    
    system_prompt = f"""
    당신은 당뇨 환자를 돕는 전문 의료 AI입니다.
    
    [현재 시각]
    {current_time_str}
    
    [환자 정보]
    {user_info}
    
    [오늘의 건강 기록 (자동 추적됨)]
    {get_today_health_summary(request.user_id, db)}
    
    [참고 의학 자료 (RAG)]
    {context_text if context_text else "관련 자료 없음 (일반적인 의학 지식으로 답변)."}
    
    [🔴 핵심 지침: "질문 의도에 따른 유연한 대응"]
    1. **답변 모드 결정**:
       - **[A. 전체 분석 모드]**: "식단 어때?", "추천해줘" 요청 -> 아래 **[구조화된 형식]** 사용.
       - **[B. 즉답 모드]**: "점수 몇 점?", "이거 먹어도 돼?" 질문 -> **결론부터 바로** 말하되, 설명이 필요하면 문단을 나누세요.
    
    2. **공통 원칙 [가독성 필수]**: 
       - 답변이 3줄 이상 길어지면 **무조건 줄바꿈(빈 줄)**을 넣어 문단을 나누세요.
       - 한 문단은 최대 2문장을 넘기지 마세요. 빽빽한 글은 읽기 힘듭니다.

    [구조화된 형식 (전체 분석 요청 시에만 사용)]
    ### 1. 📋 오늘의 기록
    *   (메뉴 및 칼로리 팩트만 나열)

    ### 2. 🩺 종합 분석
    *   **총평**: (전체적인 균형 평가)
    *   **꿀팁**: (가장 중요한 조언 1개)
    
    [제약 사항]
    1. **즉답 모드**에서도 가독성을 위해 **줄바꿈**을 적극 활용하세요.
    2. 페르소나 말투는 항상 유지하세요.
    
    [페르소나 및 말투 설정]
    위 짧은 형식 안에서 아래 말투를 녹여내세요.
    {persona}
    """
    
    # 4. LangChain 호출
    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=request.user_message)
        ]
        
        # Ollama 호출
        response = llm_text.invoke(messages)
        ai_reply = response.content

        # 5. 로그 저장 (SQLite)
        db.add(ChatLog(user_id=request.user_id, role='user', content=request.user_message))
        db.add(ChatLog(user_id=request.user_id, role='ai', content=ai_reply))
        db.commit()

        return {
            "reply": ai_reply,
            "sources": sources if sources else ["일반 지식 (Local AI)"],
            "status": "success"
        }
    except Exception as e:
        print(f"🚨 AI 호출 에러: {e}")
        raise HTTPException(status_code=500, detail="AI 응답 생성 실패")

@app.post("/analyze-food")
async def analyze_food_endpoint(file: UploadFile = File(...), user_id: str = Form(...), db: Session = Depends(get_db)):
    print(f"📸 식단 분석 요청: {file.filename}")
    
    try:
        # 이미지 읽기 & Base64 인코딩
        image_bytes = await file.read()
        encoded_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # 유저 정보
        user = db.query(User).filter(User.user_id == user_id).first()
        persona = get_persona_by_age(user.age, user.diabetes_type) if user else "영양사"

        # 프롬프트 구성
        prompt = f"""
        [페르소나] {persona}
        이 음식 사진을 분석해줘.
        
        [🔴 핵심 지침: "잡담 금지 & 형식 엄수"]
        1. **서론/결론 절대 금지**: "안녕하세요", "사진을 보니~" 같은 인사말이나 부연 설명을 일절 하지 마세요.
        2. **오직 결과만**: 아래 정해진 포맷의 텍스트만 출력하세요.
        
        [1단계: 사용자에게 보여줄 짧은 요약]
        ### 📸 이미지 분석
        * **[메뉴명]**: 약 [칼로리]kcal
        * **📊 영양**: 탄수화물 [g], 단백질 [g], 지방 [g]
        * **💡 한줄평**: [30자 이내 짧은 평가]
        
        [2단계: 시스템 데이터 (반드시 포함)]
        위 내용 밑에 다음 JSON 포맷을 정확히 붙여줘:
        ###JSON_START###
        {{
            "menu": "메뉴명 (한글)",
            "calories": 0,
            "carbs": 0,
            "protein": 0,
            "fat": 0
        }}
        ###JSON_END###
        """
        
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": f"data:image/jpeg;base64,{encoded_image}"
                }
            ]
        )
        
        response = llm_vision.invoke([message])
        result_text = response.content
        print(f"🤖 Vision 응답: {result_text}")
        
        # 로그 저장
        db.add(ChatLog(user_id=user_id, role='user', content=f"[이미지 업로드] {file.filename}"))
        db.add(ChatLog(user_id=user_id, role='ai', content=result_text))
        db.commit()

        # LLM이 이미 포맷팅된 텍스트 + JSON을 주므로 그대로 리턴
        return {
            "status": "success",
            "reply": result_text 
        }

    except Exception as e:
        print(f"🚨 이미지 분석 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))