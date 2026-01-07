from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
import uvicorn
from datetime import datetime
import uuid
import json
import base64

# 1. 앱 생성 및 설정
app = FastAPI()

# CORS 설정 (프론트엔드 접속 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 데이터 구조 정의 (Pydantic Models)
class ChatRequest(BaseModel):
    user_message: str
    user_id: str = "guest"

class SignUpRequest(BaseModel):
    user_id: str
    password: str
    name: str
    age: int
    diabetes_type: str

# 3. AWS 설정 (본인 ID 확인 필수!)
KB_ID = "XNQ8DCGVD7"  # 본인의 Knowledge Base ID 확인
MODEL_ARN = "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0"

# --- AWS 클라이언트 연결 (이 부분이 없어서 에러가 났던 겁니다!) ---
# 1) Bedrock 연결
bedrock_agent = boto3.client(service_name='bedrock-agent-runtime', region_name='us-east-1')
bedrock_runtime = boto3.client(service_name='bedrock-runtime', region_name='us-east-1') # 이미지 분석용 추가

# 2) DynamoDB 연결
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# 3) 테이블 연결
chat_table = dynamodb.Table('CareMeal-ChatLog') # 채팅 로그용 테이블
user_table = dynamodb.Table('CareMeal-Users')   # 회원가입용 테이블
# -----------------------------------------------------------

# 4. 헬퍼 함수: 채팅 로그 저장
def save_to_dynamodb(user_id, role, message):
    try:
        chat_table.put_item(
            Item={
                'user_id': user_id,
                'timestamp': datetime.now().isoformat(),
                'message_id': str(uuid.uuid4()),
                'role': role,
                'content': message
            }
        )
    except Exception as e:
        print(f"⚠️ 채팅 로그 저장 실패: {e}")

# 5. 헬퍼 함수: 유저 정보 조회
def get_user_info(user_id):
    try:
        response = user_table.get_item(Key={'user_id': user_id})
        if 'Item' in response:
            item = response['Item']
            return f"이름: {item['name']}, 나이: {item['age']}세, 진단명: {item['diabetes_type']}"
    except Exception as e:
        print(f"⚠️ 유저 정보 조회 실패: {e}")
    return "정보 없음 (비회원)"

# 5. API 엔드포인트: 채팅 (Chat)
# main.py 의 chat_endpoint 부분을 이걸로 교체하세요

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"📩 채팅 요청: {request.user_message} ({request.user_id})")
    
    try:
        # 1. 사용자 질문 DB 저장 (로그)
        save_to_dynamodb(request.user_id, 'user', request.user_message)

        # ---------------------------------------------------------
        # ★ [NEW] 2. DynamoDB에서 유저 정보(프로필) 가져오기
        # ---------------------------------------------------------
        user_info = get_user_info(request.user_id)
        if user_info != "정보 없음 (비회원)":
             print(f"🕵️‍♂️ 유저 정보 확인됨: {user_info}")

        # ---------------------------------------------------------
        # ★ [NEW] 3. 페르소나에 유저 정보 섞기 (Context Injection)
        # ---------------------------------------------------------
        persona = f"""
        너는 30년 경력의 당뇨 전문의 '김닥터'야.
        
        [현재 대화 중인 환자 정보]
        {user_info}
        
        위 환자 정보를 바탕으로 맞춤형 조언을 해줘.
        환자의 나이와 당뇨 유형을 고려해서 말투와 내용을 조정해.
        
        환자 질문: {request.user_message}
        """
        
        # 4. AI 답변 생성 (RAG)
        response = bedrock_agent.retrieve_and_generate(
            input={'text': persona},
            retrieveAndGenerateConfiguration={
                'type': 'KNOWLEDGE_BASE',
                'knowledgeBaseConfiguration': {
                    'knowledgeBaseId': KB_ID,
                    'modelArn': MODEL_ARN
                }
            }
        )
        answer = response['output']['text']
        
        # 5. AI 답변 DB 저장
        save_to_dynamodb(request.user_id, 'ai', answer)
        
        # 6. 출처 추출
        citations = []
        if 'citations' in response and response['citations']:
             for ref in response['citations'][0]['retrievedReferences']:
                 citations.append(ref['content']['text'][:100] + "...")

        return {
            "reply": answer,
            "sources": citations,
            "status": "success"
        }

    except Exception as e:
        print(f"🚨 채팅 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 6. API 엔드포인트: 회원가입 (Sign Up)
@app.post("/signup")
async def signup_endpoint(request: SignUpRequest):
    print(f"📝 회원가입 요청: {request.name} ({request.user_id})")
    
    try:
        # 아이디 중복 확인
        existing_user = user_table.get_item(Key={'user_id': request.user_id})
        if 'Item' in existing_user:
            return {"status": "error", "message": "이미 존재하는 아이디입니다."}

        # DB 저장
        user_table.put_item(
            Item={
                'user_id': request.user_id,
                'password': request.password,
                'name': request.name,
                'age': request.age,
                'diabetes_type': request.diabetes_type,
                'joined_at': datetime.now().isoformat()
            }
        )
        return {"status": "success", "message": "회원가입이 완료되었습니다!"}

    except Exception as e:
        print(f"🚨 회원가입 에러: {e}")
        raise HTTPException(status_code=500, detail="서버 오류가 발생했습니다.")

# 7. API 엔드포인트: 식단 사진 분석 (Analyze Food)
@app.post("/analyze-food")
async def analyze_food_endpoint(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    print(f"📸 식단 분석 요청: {file.filename} ({user_id})")
    
    try:
        # 1. 이미지 읽기 및 인코딩
        image_bytes = await file.read()
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        
        # 로그 저장 (사용자가 사진을 보냄)
        save_to_dynamodb(user_id, 'user', f"📸 [사진 업로드] {file.filename} 분석 요청")

        # 2. 이미지 분석 모델 (Claude 3.5 Sonnet) 호출
        model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
        payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": file.content_type, # 예: "image/jpeg"
                                "data": encoded_image
                            }
                        },
                        {
                            "type": "text",
                            "text": "이 음식 사진을 분석해줘. 메뉴 이름과 탄단지(탄수화물, 단백질, 지방) 추정치와 추정 칼로리를 알려줘. 만약 음식이 아니라면 그렇다고 말해줘. 그리고 당뇨 환자라고 생각했을 때 이 사진의 영양성분이 어떤지와 혈당 스파이크 예상 수치도 평가해줘"
                        }
                    ]
                }
            ]
        }
        
        # Bedrock Invoke Code
        response = bedrock_runtime.invoke_model(
            modelId=model_id,
            body=json.dumps(payload)
        )
        
        response_body = json.loads(response.get("body").read())
        analysis_raw_result = response_body["content"][0]["text"]
        print(f"🤖 1차 분석 완료: {analysis_raw_result[:50]}...")

        # 3. 유저 정보 조회 및 2차 가공 (페르소나 + RAG)
        user_info = get_user_info(user_id)
        
        persona = f"""
        너는 30년 경력의 당뇨 전문의 '김닥터'야.
        [현재 대화 중인 환자 정보]
        {user_info}
        
        [시스템 알림: 사용자가 식단 사진을 업로드했습니다. 아래는 이미지 분석 모델이 추출한 데이터입니다.]
        분석 결과: {analysis_raw_result}

        지시사항: 
        1. 위 분석 결과를 바탕으로 환자({user_info})에게 식단에 대한 전문적인 피드백을 주세요.
        2. 환자의 현재 상태(나이, 진단명)를 고려하여 따뜻하고 구체적인 조언을 해주세요.
        3. 분석 텍스트를 기계적으로 나열하지 말고 대화하듯이 자연스럽게 말하세요.
        """
        
        # Agent(RAG) 호출로 최종 답변 생성
        agent_response = bedrock_agent.retrieve_and_generate(
            input={'text': persona},
            retrieveAndGenerateConfiguration={
                'type': 'KNOWLEDGE_BASE',
                'knowledgeBaseConfiguration': {
                    'knowledgeBaseId': KB_ID,
                    'modelArn': MODEL_ARN
                }
            }
        )
        final_answer = agent_response['output']['text']
        
        # AI 답변 저장
        save_to_dynamodb(user_id, 'ai', final_answer)
        
        return {
            "reply": final_answer,
            "raw_analysis": analysis_raw_result, # 디버깅용으로 원본도 같이 줌
            "status": "success"
        }

    except Exception as e:
        print(f"🚨 식단 분석 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 실행 명령어: uvicorn main:app --reload