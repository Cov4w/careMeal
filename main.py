from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
import uvicorn
from datetime import datetime
import uuid
import json
import base64
import os
from dotenv import load_dotenv
from decimal import Decimal

# 환경 변수 로드
load_dotenv()

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
    details: dict | None = None # 상세 진단 정보 저장용 유연한 필드

class LoginRequest(BaseModel):
    user_id: str
    password: str

# 3. AWS 설정 (본인 ID 확인 필수!)
KB_ID = os.getenv("KB_ID")  # 환경 변수에서 로드
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

# 5. 헬퍼 함수: 유저 정보(Row) 조회
def get_user_profile(user_id):
    try:
        response = user_table.get_item(Key={'user_id': user_id})
        if 'Item' in response:
            return response['Item']
    except Exception as e:
        print(f"⚠️ 유저 정보 조회 실패: {e}")
    return None

# 6. 헬퍼 함수: 나이별 페르소나 선택
# 6. 헬퍼 함수: 나이 및 질환별 페르소나 선택
def get_persona_by_age(age, diabetes_type="일반"):
    disease_context = f"환자는 현재 '{diabetes_type}' 진단을 받은 상태입니다. 이에 맞춰 혈당 관리와 합병증 예방에 중점을 둔 조언을 해야 합니다."
    
    base_persona = ""
    if 10 <= age <= 29:
        base_persona = """
        [비조: 활기차고 동기부여를 주는 30년 경력의 건강 트레이너]
        너는 사용자의 첫 문장에서 말투를 파악해 비슷하게 맞추는 미러링 기법을 사용해.
        젊은 층임을 고려해 너무 딱딱한 의학 용어보다는 실천 가능한 꿀팁 위주로 설명해줘.
        단, 의학적 사실에 기반해야 하며, 인스턴트나 배달 음식 섭취를 줄이는 방향으로 유도해.
        상태나 주의사항을 강조할 때는 색깔(Markdown Bold 등)을 사용해줘.
        아이콘(이모지)을 적절히 사용

        ★중요: 사용자가 레시피, 식단, 조리법 등을 요구하면:
        1. 간단하게 필요한 재료와 핵심 조리법만 채팅으로 나열해줘.
        2. 답변의 맨 마지막 줄에 반드시 "[[CUSTOM_DIET_LINK]]" 라는 텍스트를 있는 그대로 추가해줘.
           (이 텍스트는 화면에서 '맞춤 식단 보러가기' 버튼으로 자동 변환됩니다.)
        """
    elif 30 <= age <= 49:
        base_persona = """
        [어조: 전문적이고 신뢰감 있는 30년 경력의 전문의 '김닥터']
        사회생활로 바쁜 3040세대임을 고려해, 현실적인 식단 조절법과 스트레스 관리법을 포함해줘.
        단호하지만 따뜻한 어조로, 만성질환 예방과 관리를 위한 구체적인 수치를 제시하며 설명해.
        상태나 주의사항을 강조할 때는 색깔(Markdown Bold 등)을 사용해줘.
        아이콘(이모지)을 적절히 사용

        ★중요: 사용자가 레시피, 식단, 조리법 등을 요구하면:
        1. 간단하게 필요한 재료와 핵심 조리법만 채팅으로 나열해줘.
        2. 답변의 맨 마지막 줄에 반드시 "[[CUSTOM_DIET_LINK]]" 라는 텍스트를 있는 그대로 추가해줘.
           (이 텍스트는 화면에서 '맞춤 식단 보러가기' 버튼으로 자동 변환됩니다.)
        """
    elif 50 <= age <= 69:
        base_persona = """
        [어조: 꼼꼼하고 다정다감한 30년 경력의 임상 영양사]
        갱년기 및 노화가 시작되는 시기임을 고려해, 영양 균형과 소화가 잘 되는 식단을 추천해줘.
        이미 만성질환이 있다면, 약물 복용 시 주의할 점이나 식사 순서(채소->단백질->탄수화물) 등을 
        구체적으로 가이드해줘.
        상태나 주의사항을 강조할 때는 색깔(Markdown Bold 등)을 사용해줘.
        아이콘(이모지)을 적절히 사용
        
        ★중요: 사용자가 레시피, 식단, 조리법 등을 요구하면:
        1. 간단하게 필요한 재료와 핵심 조리법만 채팅으로 나열해줘.
        2. 답변의 맨 마지막 줄에 반드시 "[[CUSTOM_DIET_LINK]]" 라는 텍스트를 있는 그대로 추가해줘.
           (이 텍스트는 화면에서 '맞춤 식단 보러가기' 버튼으로 자동 변환됩니다.)
        """
    else:
        base_persona = """
        [어조: 짧고 간결하게 설명하는 친절하고 인내심 많은 베테랑 간호사]
        어르신임을 고려해 아주 쉽고 천천히 설명하듯 말해줘.
        복잡한 설명보다는 '이건 드셔도 좋아요', '이건 조금만 드세요' 처럼 명확한 지침을 줘.
        중요한 수치나 주의사항은 1. 2. 3. 번호를 매겨서 보기 편하게 정리해드려.
        상태나 주의사항을 강조할 때는 색깔(Markdown Bold 등)을 사용해줘.
        아이콘(이모지)을 적절히 사용하여 친근감을 줘.
        
        답변이 너무 길면 읽기 힘드니 한눈에 보기 편하게 요약해줘.
        
        ★중요: 사용자가 레시피, 식단, 조리법 등을 요구하면:
        1. 간단하게 필요한 재료와 핵심 조리법만 채팅으로 나열해줘.
        2. 답변의 맨 마지막 줄에 반드시 "[[CUSTOM_DIET_LINK]]" 라는 텍스트를 있는 그대로 추가해줘.
           (이 텍스트는 화면에서 '맞춤 식단 보러가기' 버튼으로 자동 변환됩니다.)
        """
    
    return f"{base_persona}\n\n[환자 질환 정보]\n{disease_context}"

# 5. API 엔드포인트: 채팅 (Chat)
# main.py 의 chat_endpoint 부분을 이걸로 교체하세요

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"📩 채팅 요청: {request.user_message} ({request.user_id})")
    
    try:
        # 1. 사용자 질문 DB 저장 (로그)
        save_to_dynamodb(request.user_id, 'user', request.user_message)

        # ---------------------------------------------------------
        # ★ [NEW] 2. DynamoDB에서 유저 정보(프로필) 가져오기 & 페르소나 선정
        # ---------------------------------------------------------
        profile = get_user_profile(request.user_id)
        
        user_info_str = "정보 없음 (비회원)"
        persona_style = "너는 30년 경력의 당뇨 전문의 '김닥터'야. 환자에게 따뜻하게 대하고 의학적 사실에 기반해 답변해줘." # 기본값

        if profile:
            age = int(profile['age'])
            diabetes_type = profile.get('diabetes_type', '일반')
            user_info_str = f"이름: {profile['name']}, 나이: {age}세, 진단명: {diabetes_type}"
            persona_style = get_persona_by_age(age, diabetes_type)
            print(f"🕵️‍♂️ 유저 정보 확인됨: {user_info_str} (페르소나 적용)")

        # ---------------------------------------------------------
        # ★ [NEW] 3. 페르소나에 유저 정보 섞기 (Context Injection)
        # ---------------------------------------------------------
        persona = f"""
        [페르소나 지침]
        {persona_style}
        
        [현재 대화 중인 환자 정보]
        {user_info_str}
        
        [지시사항]
        위 페르소나와 환자 정보를 바탕으로 맞춤형 조언을 해주세요.
        
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
        
        # 6. 출처 추출 (파일 이름만)
        citations = []
        if 'citations' in response and response['citations']:
             for ref in response['citations'][0]['retrievedReferences']:
                 # S3 URI에서 파일명만 추출 (예: s3://bucket/path/to/diet.pdf -> diet.pdf)
                 if 'location' in ref and 's3Location' in ref['location']:
                     uri = ref['location']['s3Location']['uri']
                     file_name = uri.split('/')[-1] # URL의 마지막 부분이 파일명
                     citations.append(file_name)
                 else:
                     # S3가 아닌 경우 (데이터 소스 타입에 따라 다를 수 있음)
                     citations.append("관련 문서")

        # ---------------------------------------------------------
        # ★ [NEW] 7. RAG 검색 결과가 없을(Citations 공란) 경우 기본 모델로 폴백
        # ---------------------------------------------------------
        if not citations:
            print("⚠️ RAG 검색 결과 없음 (Citations Empty). 기본 모델(Claude 3.5 Sonnet)로 전환합니다.")
            
            fallback_prompt = f"""
            {persona}
            
            [상황 설명]
            RAG(지식 검색) 시스템이 관련 문서를 찾지 못했습니다. (검색된 자료 없음)
            따라서 당신의 일반적인 의학 지식과 상식을 활용해 답변해야 합니다.
            
            [지시사항]
            1. 사용자 질문에 친절하고 전문적으로 답변하세요.
            2. 답변의 시작 부분에 다음 문구를 반드시 포함하세요:
               "📢 **내부 데이터베이스에서 관련 자료를 찾지 못해, AI 모델의 일반 지식으로 답변드립니다.**"
            3. 답변은 설정된 페르소나의 말투를 유지하세요.
            
            사용자 질문: {request.user_message}
            """
            
            # Base Model 호출 (Claude 3.5 Sonnet)
            model_id = "anthropic.claude-3-5-sonnet-20240620-v1:0"
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1500,
                "messages": [
                    {
                        "role": "user",
                        "content": fallback_prompt
                    }
                ]
            }
            
            try:
                fb_response = bedrock_runtime.invoke_model(
                    modelId=model_id,
                    body=json.dumps(payload)
                )
                fb_response_body = json.loads(fb_response.get("body").read())
                answer = fb_response_body["content"][0]["text"]
                citations = ["AI 일반 상식 (검색 결과 없음)"]
                print("✅ 기본 모델 폴백 답변 생성 완료")
                
            except Exception as fb_error:
                print(f"🚨 기본 모델 폴백 실패: {fb_error}")
                # 폴백도 실패하면 원래의(아마도 '모르겠다'는) RAG 답변을 그대로 둠
                if not answer:
                    answer = "죄송합니다. 관련 정보를 찾을 수 없으며, 일반적인 답변 생성 중에도 오류가 발생했습니다."

        return {
            "reply": answer,
            "sources": citations,
            "status": "success"
        }

    except Exception as e:
        print(f"🚨 채팅 에러: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper for DynamoDB Float issue
def convert_floats_to_decimals(obj):
    if isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    return obj

# 7. API 엔드포인트: 회원가입 (Sign Up)
@app.post("/signup")
async def signup_endpoint(request: SignUpRequest):
    print(f"📝 회원가입 요청: {request.user_id}, {request.name}")
    try:
        # 중복 ID 체크
        response = user_table.get_item(Key={'user_id': request.user_id})
        if 'Item' in response:
            raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
        
        # DynamoDB does not support float, convert to Decimal
        safe_details = convert_floats_to_decimals(request.details or {})

        # DB 저장
        user_table.put_item(
            Item={
                'user_id': request.user_id,
                'password': request.password,
                'name': request.name,
                'age': request.age,
                'diabetes_type': request.diabetes_type,
                'details': safe_details, # 상세 정보 저장 (Decimal 변환 됨)
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
        profile = get_user_profile(user_id)
        
        user_info_str = "정보 없음 (비회원)"
        persona_style = "너는 30년 경력의 전문의 '김닥터'야. 환자에게 따뜻하게 대하고 의학적 사실에 기반해 답변해줘."

        if profile:
            age = int(profile['age'])
            diabetes_type = profile.get('diabetes_type', '일반')
            user_info_str = f"이름: {profile['name']}, 나이: {age}세, 진단명: {diabetes_type}"
            persona_style = get_persona_by_age(age, diabetes_type)
        
        persona = f"""
        [페르소나 지침]
        {persona_style}
        
        [현재 대화 중인 환자 정보]
        {user_info_str}
        
        [시스템 알림: 사용자가 식단 사진을 업로드했습니다. 아래는 이미지 분석 모델이 추출한 데이터입니다.]
        분석 결과: {analysis_raw_result}

        [지시사항]
        1. 위 페르소나와 환자 정보를 바탕으로 식단에 대한 전문적인 피드백을 주세요.
        2. 분석 텍스트를 기계적으로 나열하지 말고, 당신의 페르소나로 자연스럽게 설명해주세요.
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

    except Exception as e:
        print(f"🚨 회원가입 에러: {e}")
        raise HTTPException(status_code=500, detail="서버 오류가 발생했습니다.")

# 8. API 엔드포인트: 로그인 (Login)
@app.post("/login")
async def login_endpoint(request: LoginRequest):
    print(f"🔑 로그인 요청: {request.user_id}")
    try:
        response = user_table.get_item(Key={'user_id': request.user_id})
        if 'Item' not in response:
             raise HTTPException(status_code=401, detail="존재하지 않는 아이디입니다.")
        
        item = response['Item']
        if item['password'] != request.password:
            raise HTTPException(status_code=401, detail="비밀번호가 일치하지 않습니다.")
            
        print(f"✅ 로그인 성공: {item['name']}")
        
        # 상세 정보 가져오기
        details = item.get('details', {})
        
        return {
            "status": "success",
            "message": "로그인 성공",
            "data": {
                "name": item['name'],
                "age": int(item['age']),
                "diabetes_type": item['diabetes_type'],
                # DB의 details 필드에서 복원, 없으면 기본값
                "conditions": [item['diabetes_type']], # 주요 질환은 별도 관리
                "gender": details.get('gender', "미정"), 
                "height": details.get('height', "0"),
                "weight": details.get('weight', "0"),
                "bmi": details.get('bmi', 0),
                "weightStatus": details.get('weightStatus', "미정"),
                "habitScore": details.get('habitScore', 0),
                "summary": details.get('summary', {}) 
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"🚨 로그인 에러: {e}")
        raise HTTPException(status_code=500, detail="서버 오류가 발생했습니다.")