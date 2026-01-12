import { ChatRequest, ChatResponse } from '@/types';

// Helper to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Pre-defined responses for the persona
const RESPONSES = [
  {
    keywords: ['안녕', '반가', '하이'],
    reply: "안녕하세요, 환자분. CareMeal의 주치의 **김닥터**입니다. \n\n오늘 컨디션은 좀 어떠신가요? 식사는 규칙적으로 하셨는지 궁금하네요. 😊",
    sources: ["당뇨 관리 가이드라인 2024", "대한당뇨병학회 인사말"]
  },
  {
    keywords: ['혈당', '수치', '높아', '낮아'],
    reply: "혈당 수치 때문에 걱정이 많으시군요. \n\n식후 2시간 혈당이 **200mg/dL**를 넘지 않도록 관리하는 것이 중요합니다. \n\n최근에 드신 음식 중 탄수화물이 많은 메뉴가 있었나요? 저와 함께 식단을 점검해봅시다.",
    sources: ["임상영양학 가이드", "혈당 관리 프로토콜 v1.2"]
  },
  {
    keywords: ['식단', '메뉴', '추천', '뭐 먹지'],
    reply: "당뇨 관리에 좋은 식단을 찾으시는군요! 🥗\n\n**추천 식단:**\n- 현미밥 2/3공기\n- 닭가슴살 샐러드 (드레싱 최소화)\n- 시금치 나물\n\n단백질과 섬유질이 풍부한 식사는 혈당 스파이크를 예방하는 데 큰 도움이 됩니다.",
    sources: ["CareMeal 영양 데이터베이스", "2024 당뇨 식단표"]
  },
  {
    keywords: ['운동', '걷기', '헬스'],
    reply: "운동은 인슐린 감수성을 높이는 최고의 약입니다! 💪\n\n식사 후 **30분 뒤 가벼운 산책**을 하시는 것을 강력히 추천드립니다. 무리하지 마시고 하루 30분, 주 5회 꾸준히 실천해보세요.",
    sources: ["운동생리학 저널", "미국당뇨병협회(ADA) 권고안"]
  }
];

const DEFAULT_RESPONSE = "말씀해주셔서 감사합니다, 환자분. \n\n기록해주신 내용은 꼼꼼히 차트에 적어두겠습니다. 혹시 더 불편한 점이나 궁금한 점이 있으시다면 언제든 편하게 말씀해주세요. 제가 곁에서 돕겠습니다. 👨‍⚕️";

export const mockChatApi = async (req: ChatRequest): Promise<ChatResponse> => {
  // Simulate 3-5 seconds latency
  const latency = Math.floor(Math.random() * 2000) + 3000; 
  await delay(latency);

  // Updated to use 'user_message' based on backend spec
  const message = req.user_message.toLowerCase();
  
  const matchedResponse = RESPONSES.find(r => 
    r.keywords.some(k => message.includes(k))
  );

  if (matchedResponse) {
    return {
      reply: matchedResponse.reply,
      sources: matchedResponse.sources
    };
  }

  return {
    reply: DEFAULT_RESPONSE,
    sources: []
  };
};