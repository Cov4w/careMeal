from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from datetime import datetime, timedelta
import uuid
import json
import base64
import os
import re
import traceback
from dotenv import load_dotenv
import torch

# --- [NEW] Local AI & Database Stack & RAG ---
from sqlalchemy import create_engine, Column, String, Integer, JSON, Text, DateTime, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# from langchain_community.chat_models import ChatOllama # [Ollama 제거]
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
# 환경 변수 로드
# 환경 변수 로드
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_status = load_dotenv(env_path)
print(f"📂 Loading .env from: {env_path} (Success: {load_status})")


from fastapi.staticfiles import StaticFiles

# 1. 앱 생성 및 설정
app = FastAPI()

# 정적 파일 서빙 설정 (로컬 이미지용)
# 배포 시 static 폴더만 같이 옮기면 됨
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

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
    height = Column(Float)
    weight = Column(Float)
    gender = Column(String)
    diabetes_type = Column(String)
    other_conditions = Column(String) # JSON String or Comma-separated
    details = Column(JSON, default={})
    joined_at = Column(DateTime, default=datetime.now)

class ChatLog(Base):
    __tablename__ = "chat_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    role = Column(String) # user or ai
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.now)

class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)          # 메뉴명
    description = Column(String)               # 한줄 설명
    image_url = Column(String)                 # 이미지 URL (없으면 기본 이미지)
    disease_tag = Column(String)               # 추천 질환 태그 (콤마로 구분, 예: '당뇨,비만')
    category = Column(String)                  # 카테고리 (한식, 일품 등)
    diet_type = Column(String)                 # 식단 타입 (고기, 해산물, 비건 등)
    ingredients = Column(Text)                 # 재료 목록 (검색/유사도 분석용)
    instructions = Column(Text)                # [New] 조리 방법 (상세 텍스트)
    time_minutes = Column(Integer)             # 조리 시간 (분)
    
    # 영양 정보 (1인분 기준)
    calories = Column(Integer)
    carbs = Column(Float)
    protein = Column(Float)
    fat = Column(Float)
    sodium = Column(Float)                     # 나트륨 (mg)

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

class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    preference = Column(String)  # 'like' or 'dislike'
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

# 4. LLM 설정 (Cloud Ollama Proxy)
import requests
from typing import List, Optional, Any, Dict
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.outputs import ChatResult, ChatGeneration

# 4. LLM 설정 (Custom Cloud Proxy Wrapper)
# .env 파일에서 API 키 로드
fav_api_key_raw = os.getenv("FAV_API_KEY")
fav_api_key = fav_api_key_raw.strip() if fav_api_key_raw else ""
ollama_url = "https://fav.nezip.co.kr/ollama"

# [Custom Chat Model] requests를 직접 사용하여 확실하게 헤더 전송
class CustomOllamaChat(BaseChatModel):
    base_url: str
    api_key: str
    model_name: str = "llama3.1"
    temperature: float = 0.7

    def _generate(self, messages: List[BaseMessage], stop: Optional[List[str]] = None, run_manager: Any = None, **kwargs: Any) -> ChatResult:
        # 메시지 변환 (LangChain -> OpenAI/Ollama Format)
        formatted_messages = []
        for msg in messages:
            role = "user"
            if isinstance(msg, SystemMessage): role = "system"
            elif isinstance(msg, AIMessage): role = "assistant"
            
            content = msg.content
            images = []

            # 이미지 처리 (Vision) - LangChain 멀티모달 포맷 처리
            if isinstance(content, list):
                text_content = ""
                for part in content:
                    if isinstance(part, str):
                        text_content += part
                    elif isinstance(part, dict):
                        if part.get("type") == "text":
                            text_content += part.get("text", "")
                        elif part.get("type") == "image_url":
                            # base64 이미지 데이터 추출 (data:image/jpeg;base64,...)
                            # Ollama API는 보통 'images': [base64_string] 형태를 원함
                            img_url_data = part.get("image_url", {})
                            # image_url이 dict가 아니라 str일 수도 있음
                            if isinstance(img_url_data, str):
                                img_url = img_url_data
                            else:
                                img_url = img_url_data.get("url", "")
                            
                            if img_url and img_url.startswith("data:image"):
                                # 헤더 제거하고 순수 Base64만 추출
                                try:
                                    base64_str = img_url.split(",")[1]
                                    images.append(base64_str)
                                except IndexError:
                                    pass
                
                content = text_content
            
            # 메시지 객체 구성
            message_payload = {"role": role, "content": content}
            if images:
                message_payload["images"] = images
                
            formatted_messages.append(message_payload)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model_name,
            "messages": formatted_messages,
            "stream": False,
            "options": {
                "temperature": self.temperature
            }
        }

        try:
            # 실제 호출 (User 예제 코드와 동일 방식)
            response = requests.post(f"{self.base_url}/api/chat", headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            
            result_json = response.json()
            ai_content = result_json["message"]["content"]
            
            return ChatResult(generations=[ChatGeneration(message=AIMessage(content=ai_content))])
            
        except Exception as e:
            print(f"🚨 Custom LLM Error: {e}")
            if 'response' in locals() and response is not None:
                print(f"Server Response: {response.text}")
            raise e

    @property
    def _llm_type(self) -> str:
        return "custom_ollama"

# 4-1. LLM 초기화 (Custom Class 사용)
if fav_api_key:
    print(f"🔑 API Key Loaded: {fav_api_key[:4]}*** (Len: {len(fav_api_key)})")
else:
    print("🚨 API Key NOT FOUND! Please check .env file.")

llm_text = CustomOllamaChat(base_url=ollama_url, api_key=fav_api_key, model_name="llama4:latest", temperature=0.7)
# Vision 모델도 이제 CustomOllamaChat (llama4) 사용
llm_vision = CustomOllamaChat(base_url=ollama_url, api_key=fav_api_key, model_name="llama4:latest", temperature=0.2)
llm_agent = CustomOllamaChat(base_url=ollama_url, api_key=fav_api_key, model_name="llama4:latest", temperature=0.5)

# 4-2. RAG 시스템 변수 (전역)
vector_store = None
retriever = None

@app.on_event("startup")
async def startup_event():
    global vector_store, retriever
    print("🚀 [Startup] RAG 시스템 초기화 중...")
    
    # 1. 임베딩 모델 로드 (Mac M3 가속: MPS, CUDA: NVIDIA, CPU: Fallback)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    try:
        if torch.backends.mps.is_available():
            device = "mps"
    except:
        pass

    print(f"🖥️ AI Device: {device}")

    embeddings = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sbert-nli",
        model_kwargs={'device': device}
    )
    
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

# 헬퍼 함수: 특정 날짜 식단/혈당 가져오기 (AI용)
def get_daily_health_summary(user_id: str, date_str: str, db: Session):
    meals = db.query(MealRecord).filter(MealRecord.user_id == user_id, MealRecord.date == date_str).all()
    health = db.query(HealthRecord).filter(HealthRecord.user_id == user_id, HealthRecord.date == date_str).all()
    
    summary = f"[{date_str} 건강 기록]\n"
    print(f"🕵️ 건강 기록 조회 ({user_id}, {date_str}): 식단 {len(meals)}개, 혈당 {len(health)}개") # [Log]
    if meals:
        # 영어 meal_type을 한글로 변환하여 LLM에게 제공
        type_map = {"breakfast": "아침", "lunch": "점심", "dinner": "저녁", "snack": "간식"}
        summary += "- 식단:\n" + "\n".join([f"  * {type_map.get(m.meal_type, m.meal_type)}: {m.menu} ({m.calories}kcal)" for m in meals]) + "\n"
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
    
    # 0. 날짜 감지 (간단 구현: '어제' 키워드 체크)
    target_date = datetime.now()
    if "어제" in request.user_message:
        target_date = target_date - timedelta(days=1)
    
    target_date_str = target_date.strftime("%Y-%m-%d")
    
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
            
    # 3. 시스템 프롬프트 구성
    now = datetime.now()
    current_time_str = now.strftime("%Y년 %m월 %d일 %H시 %M분")
    
    # 시간대별 식사 구분 로직
    hour = now.hour
    minute = now.minute
    total_minutes = hour * 60 + minute
    
    meal_time_context = "간식/야식"
    if 6 * 60 <= total_minutes < 10 * 60 + 30: # 06:00 ~ 10:30
        meal_time_context = "아침"
    elif 10 * 60 + 30 <= total_minutes < 15 * 60: # 10:30 ~ 15:00
        meal_time_context = "점심"
    elif 15 * 60 <= total_minutes < 20 * 60: # 15:00 ~ 20:00
        meal_time_context = "저녁"
    else:
        meal_time_context = "야식 (또는 내일 아침)"

    # 타겟 날짜의 기록 가져오기
    health_summary = get_daily_health_summary(request.user_id, target_date_str, db)

    # [NEW] 맞춤 레시피 DB 조회 (상위 3개)
    rec_list_str = "현재 추천 가능한 DB 레시피가 없습니다."
    try:
        rec_data = get_recipe_recommendations(request.user_id, db)
        if rec_data and 'recommendations' in rec_data:
            rec_list_str = ""
            top_recipes = rec_data['recommendations'][:3]
            for r in top_recipes:
                rec_list_str += f"- (ID: {r['id']}) {r['name']}: {r['description']} / {r['calories']}kcal\n"
    except Exception as e:
        print(f"⚠️ 레시피 로드 실패: {e}")

    system_prompt = f"""
    당신은 만성 질환 환자를 돕는 전문 의료 AI입니다.
    
    [현재 시각]
    {current_time_str}
    
    [현재 추천 시간대]
    👉 **{meal_time_context}** 시간입니다. (식단 추천 시 이 시간대에 맞는 메뉴를 추천하세요.)
    
    [환자 정보]
    {user_info}
    
    [조회된 건강 기록 ({target_date_str} 기준)]
    {health_summary}
    (※ 주의: 위 기록에 '기록 없음'이라고 되어 있으면, 절대로 사용자가 밥을 먹었다고 가정하지 마세요. 없는 내용을 지어내면 해고됩니다.)
    
    [참고 의학 자료 (RAG)]
    {context_text if context_text else "관련 자료 없음 (일반적인 의학 지식으로 답변)."}
    
    [🍱 현재 환자 맞춤 DB 레시피 목록 (최우선 추천 대상)]
    {rec_list_str}

    [🔴 답변 원칙 (반드시 준수)]
    1. **거짓말 금지**: 위 [건강 기록]에 없는 식단을 있는 것처럼 말하지 마세요. 기록이 없으면 "아직 {meal_time_context} 기록이 없네요!"라고 말하고 추천만 하세요.
    2. **시간대 맞춤 추천**: 
       - **아침/점심/저녁**: 든든하고 균형 잡힌 식단을 추천하세요.
       - **야식**: 🚨 **경고부터 하세요.** "늦은 시간 섭취는 혈당을 급격히 높입니다."라고 말하고, 정 배고프면 '오이, 토마토, 따뜻한 차' 같은 가벼운 것만 추천하세요.
    3. **DB 레시피 활용**: 식단을 추천할 때는 무조건 위 **[맞춤 DB 레시피 목록]**에 있는 메뉴를 1개 이상 골라서 제안하세요.
    4. **추천 카드 생성 트리거 (매우 중요)**:
       - 위 **[맞춤 DB 레시피 목록]**에 있는 메뉴를 추천했다면, 답변의 **맨 마지막 줄**에 `[RECIPE:ID:메뉴명]` 형식을 반드시 붙여주세요.
       - 띄어쓰기 없이 정확히 쓰세요. 예: `[RECIPE:5:닭가슴살 샐러드]` (O), `[RECIPE: 5 : ...]` (X)
       - ❌ 주의: `[[CUSTOM_LINK]]` 같은 건 절대 출력하지 마세요. 오직 `[RECIPE:...]`만 쓰세요.

    5. **초간결 답변**: 말이 길어지면 안 됩니다. 핵심만 딱 자르세요. (존댓말 사용)
    6. **가독성 (줄바꿈 필수)**: 문장 끝마다 줄바꿈을 하세요. 문단 사이에는 빈 줄을 넣으세요.

    [답변 포맷 예시 - 추천 요청 시]
    (기록이 없을 때)
    아직 {meal_time_context} 식사 기록이 없으시네요! 🍽️
    
    **추천 {meal_time_context} 메뉴**
    *   **메뉴**: (DB 레시피 중 하나)
    *   **이유**: (짧은 이유)
    
    [RECIPE:12:추천메뉴명]

    (기록이 있을 때)
    오늘 {meal_time_context}은 잘 챙겨 드셨네요! 👍
    
    **다음 식사 추천**
    *   **메뉴**: (다음 끼니 메뉴)
    *   **팁**: (간단한 조언)
    
    [페르소나]
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
        
        # [Sanitize] 불필요한 태그 제거 및 보정
        ai_reply = ai_reply.replace("[[CUSTOM_LINK]]", "").replace("[[CUSTOM_DIET_LINK]]", "")
        # 혹시 모를 공백 제거
        import re
        ai_reply = re.sub(r'\[RECIPE:\s*(\d+)\s*:', r'[RECIPE:\1:', ai_reply)

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

class NutritionEstimateRequest(BaseModel):
    menu_name: str

@app.post("/estimate-nutrition")
async def estimate_nutrition_endpoint(request: NutritionEstimateRequest):
    print(f"🥦 영양 성분 추론 요청: {request.menu_name}")
    try:
        prompt = f"""
        당신은 전문 영양사입니다. 
        사용자가 입력한 메뉴: "{request.menu_name}"
        
        이 메뉴의 1인분 기준 대략적인 영양 성분을 추정해서 JSON 포맷으로 알려주세요.
        다른 말은 하지 말고, 오직 JSON 데이터만 출력하세요.
        
        [출력 형식]
        {{
            "calories": 0,
            "carbs": 0,
            "protein": 0,
            "fat": 0
        }}
        (단위: kcal, g)
        """
        
        # 텍스트 모델 호출
        messages = [HumanMessage(content=prompt)]
        response = llm_text.invoke(messages)
        content = response.content
        
        # JSON 파싱 시도 (LLM이 마크다운 ```json ... ``` 을 붙일 수 있으므로 처리)
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            return json.loads(json_str)
        else:
            # 실패 시 기본값 리턴
            return {"calories": 0, "carbs": 0, "protein": 0, "fat": 0}

    except Exception as e:
        print(f"🚨 추론 에러: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from sqlalchemy import or_, ForeignKey
from sqlalchemy.orm import relationship

from typing import List, Optional

# --- Preference Request Model ---
class PreferenceRequest(BaseModel):
    user_id: str
    recipe_id: int
    preference: str  # 'like' or 'dislike'
    
@app.post("/user/preference")
async def save_user_preference(req: PreferenceRequest, db: Session = Depends(get_db)):
    # 기존 기록 확인 (중복 방지)
    existing = db.query(UserPreference).filter(
        UserPreference.user_id == req.user_id, 
        UserPreference.recipe_id == req.recipe_id
    ).first()
    
    if existing:
        existing.preference = req.preference
        existing.timestamp = datetime.now()
        print(f"🔄 선호도 업데이트: {req.user_id} -> Recipe {req.recipe_id}: {req.preference}")
    else:
        new_pref = UserPreference(
            user_id=req.user_id,
            recipe_id=req.recipe_id,
            preference=req.preference
        )
        db.add(new_pref)
        print(f"❤️ 선호도 저장: {req.user_id} -> Recipe {req.recipe_id}: {req.preference}")
    
    db.commit()
    return {"status": "success"}

# --- Pydantic Models for Response ---
class RecipeSchema(BaseModel):
    id: int
    name: Optional[str] = "이름 없음"
    description: Optional[str] = None
    image_url: Optional[str] = None
    disease_tag: Optional[str] = None
    category: Optional[str] = None
    diet_type: Optional[str] = None
    ingredients: Optional[str] = None
    instructions: Optional[str] = None         # [New]
    time_minutes: Optional[int] = 20
    calories: Optional[int] = 0
    carbs: Optional[float] = 0.0
    protein: Optional[float] = 0.0
    fat: Optional[float] = 0.0
    sodium: Optional[float] = 0.0
    is_liked: Optional[bool] = False # [New] 좋아요 여부

    class Config:
        from_attributes = True # ORM 객체를 Pydantic 모델로 읽기 위함 (구 orm_mode)

class RecommendationResponse(BaseModel):
    user_condition: str
    recommendations: List[RecipeSchema]

from fastapi.responses import JSONResponse
import traceback

@app.get("/recipes/recommendations/{user_id}")
def get_recipe_recommendations(user_id: str, db: Session = Depends(get_db)):
    try:
        print(f"🥗 맞춤 레시피 추천 요청: {user_id}")
        
        # 1. 사용자 정보 확인
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # [1단계] Rule-Based Filtering (질환 기반 안전 필터링)
        target_tags = []
        
        # 당뇨 및 대사증후군 정밀 분석
        diabetes_info = user.diabetes_type or ""
        if "당뇨" in diabetes_info: 
            target_tags.append("당뇨")
        
        # [변경] 대사증후군 관련 데이터 통합 관리 (비만, 고지혈증 -> 대사증후군)
        if "대사증후군" in diabetes_info:
            target_tags.append("대사증후군")
        
        # 기타 질환
        other_conds_str = user.other_conditions or "" 
        if "고혈압" in other_conds_str and "고혈압" not in target_tags: 
            target_tags.append("고혈압")
        
        # 고지혈증 -> 대사증후군으로 대체
        if "고지혈증" in other_conds_str: 
            if "대사증후군" not in target_tags:
                target_tags.append("대사증후군")
                
        if "신부전" in other_conds_str: target_tags.append("신부전")
            
        if user.weight and user.height:
             bmi = user.weight / ((user.height / 100) ** 2)
             # 비만 -> 대사증후군으로 대체
             if bmi >= 25: 
                 if "대사증후군" not in target_tags:
                     target_tags.append("대사증후군")
        
        if not target_tags: target_tags.append("일반건강")
        
        # 질환 태그 필터링
        filter_conditions = [Recipe.disease_tag.contains(tag) for tag in target_tags]
        candidates = db.query(Recipe).filter(or_(*filter_conditions)).all()
        
        if not candidates:
            candidates = db.query(Recipe).filter(Recipe.disease_tag == "일반건강").all()

        # [2단계] Content-Based Scoring (취향 기반 가중치 부여)
        scored_recipes = []
        liked_recipe_ids = []
        disliked_recipe_ids = []
        try:
            # 최근 14일간 식단 기록 조회
            two_weeks_ago = (datetime.now() - timedelta(days=14)).strftime("%Y-%m-%d")
            
            recent_records = db.query(MealRecord)\
                .filter(MealRecord.user_id == user_id, MealRecord.date >= two_weeks_ago)\
                .all()
            
            # 선호 키워드 추출 (직접 menu 컬럼 사용)
            preference_keywords = {}
            for record in recent_records:
                if record.menu:
                    # 메뉴명에서 키워드 추출
                    words = str(record.menu).split()
                    for w in words:
                        if len(w) > 1:
                             preference_keywords[w] = preference_keywords.get(w, 0) + 1
                    
            # 2-2. [NEW] 직접적인 좋아요/싫어요 피드백 반영
            user_prefs = db.query(UserPreference).filter(UserPreference.user_id == user_id).all()
            liked_recipe_ids = [p.recipe_id for p in user_prefs if p.preference == 'like']
            disliked_recipe_ids = [p.recipe_id for p in user_prefs if p.preference == 'dislike']

            print(f"🧐 유저 선호 키워드 Top 5: {sorted(preference_keywords.items(), key=lambda x:x[1], reverse=True)[:5]}")
            print(f"❤️ 좋아요한 레시피 ID: {liked_recipe_ids}")

            # 점수 계산
            for recipe in candidates:
                # 싫어요한 레시피는 제외 (또는 점수 대폭 깎기)
                if recipe.id in disliked_recipe_ids:
                    continue

                score = 0
                
                # 좋아요한 레시피 가산점 (강력함)
                if recipe.id in liked_recipe_ids:
                    score += 50 

                content_text = (str(recipe.name) + " " + str(recipe.ingredients or "")).replace(",", " ")
                
                for keyword, count in preference_keywords.items():
                    if keyword in content_text:
                        score += (count * 1.5)
                
                score += (recipe.id * 0.1)
                scored_recipes.append({"score": score, "recipe": recipe})
                
            # 점수 내림차순 정렬
            scored_recipes.sort(key=lambda x: x["score"], reverse=True)
            final_recommendations = [item["recipe"] for item in scored_recipes]

        except Exception as e:
            print(f"⚠️ 추천 알고리즘 에러 (기본 결과 반환): {e}")
            final_recommendations = candidates

        # [수동 변환] Pydantic 검증 에러 회피를 위해 dict로 변환
        final_results_json = []
        for r in final_recommendations:
            final_results_json.append({
                "id": r.id,
                "name": r.name,
                "description": r.description or "",
                "image_url": r.image_url or "",
                "disease_tag": r.disease_tag or "",
                "category": r.category or "",
                "diet_type": r.diet_type or "",
                "ingredients": r.ingredients or "",
                "instructions": r.instructions or "", # [New]
                "time_minutes": r.time_minutes or 20,
                "calories": r.calories or 0,
                "carbs": r.carbs or 0.0,
                "protein": r.protein or 0.0,
                "fat": r.fat or 0.0,
                "sodium": r.sodium or 0.0,
                "is_liked": r.id in liked_recipe_ids # [New] 좋아요 여부 매핑
            })

        print(f"✅ 최종 추천 결과({len(final_results_json)}개) 반환")
        return {
            "user_condition": ", ".join(target_tags), 
            "recommendations": final_results_json
        }
    except Exception as e:
        error_msg = f"CRITICAL ERROR: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})