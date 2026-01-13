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

# 6. 헬퍼 함수: 페르소나
def get_persona_by_age(age, diabetes_type="일반"):
    disease_context = f"환자는 현재 '{diabetes_type}' 진단을 받은 상태입니다."
    base_persona = ""
    if 10 <= age <= 29:
        base_persona = "[활기찬 30년 경력 트레이너] 젊은 층에 맞춰 이모지를 쓰고 실용적인 꿀팁을 줘."
    elif 30 <= age <= 49:
        base_persona = "[신뢰감 있는 전문의 김닥터] 바쁜 직장인을 위해 현실적인 조언과 따뜻한 격려를 해줘."
    elif 50 <= age <= 69:
        base_persona = "[꼼꼼한 임상 영양사] 갱년기와 노화를 고려해 소화가 잘 되는 식단을 추천해줘."
    else:
        base_persona = "[친절한 베테랑 간호사] 어르신이 이해하기 쉽게 천천히 설명하고 중요 내용은 번호를 매겨줘."
    
    return f"{base_persona}\n{disease_context}\n레시피 요구시 '[[CUSTOM_DIET_LINK]]'를 마지막에 붙여."

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
    
    # 1. RAG 검색 (기존 로직 유지)
    context_docs = []
    sources = [] # sources 변수 초기화
    if retriever:
        try:
            docs = retriever.invoke(request.user_message)
            if docs:
                context_docs = [doc.page_content for doc in docs]
                # 소스 파일명 추출 (중복 제거, OS 경로 호환)
                sources = list(set([os.path.basename(doc.metadata.get("source", "문서")) for doc in docs]))
                print(f"📚 검색된 문서: {sources}")
            else:
                print("⚠️ 관련 문서를 찾지 못했습니다.")
        except Exception as e:
            print(f"⚠️ 검색 중 오류 발생: {e}")
            
    # 2. 사용자 정보 & 오늘 기록 조회 [NEW]
    user_profile = get_user_profile_db(request.user_id, db)
    health_summary = get_today_health_summary(request.user_id, db)
    
    persona = "친절한 의료 AI" # 기본 페르소나 설정
    if user_profile:
        persona = get_persona_by_age(user_profile['age'], user_profile['diabetes_type'])

    # 3. 시스템 프롬프트 구성
    system_prompt = f"""
    당신은 환자를 돕는 의료 AI입니다.
    
    [페르소나]
    {persona}
    
    [환자 정보]
    이름/나이: {user_profile['name'] if user_profile else '알 수 없음'} / {user_profile['age'] if user_profile else '?'}
    당뇨 유형: {user_profile['diabetes_type'] if user_profile else '?'}
    
    {health_summary}
    
    [참고 의학 자료]
    {chr(10).join(context_docs) if context_docs else "관련 자료 없음 (일반 지식으로 답변하세요)."}
    
    위 정보를 바탕으로 환자의 질문에 답변하세요. 특히 오늘 먹은 음식이나 혈당이 있다면 그것을 언급하며 조언하세요.
    참고 자료에 없는 내용은 지어내지 말고, 일반적인 의학 상식에 기반해 조언하세요.
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
        b64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        # 유저 정보
        user = db.query(User).filter(User.user_id == user_id).first()
        persona = get_persona_by_age(user.age, user.diabetes_type) if user else "영양사"

        # 프롬프트 구성
        prompt = f"""
        [페르소나] {persona}
        이 음식 사진을 분석해줘. 메뉴 이름과 탄단지 추정치를 알려줘.
        
        ★필수: 답변 마지막에 반드시 아래 JSON 포맷을 포함해.
        ###JSON_START###
        {{ "menu": "메뉴명", "calories": 0, "carbs": 0, "protein": 0, "fat": 0 }}
        ###JSON_END###
        """

        # Vision 모델 호출 (Llava)
        # LangChain ChatOllama는 멀티모달 입력을 지원함 (message content에 image_url type)
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": f"data:image/jpeg;base64,{b64_image}"
                }
            ]
        )
        
        response = llm_vision.invoke([message])
        ai_reply = response.content
        
        # 로그 저장
        db.add(ChatLog(user_id=user_id, role='user', content=f"[이미지 업로드] {file.filename}"))
        db.add(ChatLog(user_id=user_id, role='ai', content=ai_reply))
        db.commit()

        return {
            "reply": ai_reply,
            "status": "success"
        }

    except Exception as e:
        print(f"🚨 이미지 분석 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))