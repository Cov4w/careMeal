# 🚀 완전한 Docker Hub 배포 가이드

## 📋 목차
1. [전체 아키텍처](#1-전체-아키텍처)
2. [이미지 빌드 & 푸시](#2-이미지-빌드--푸시)
3. [데이터 관리 전략](#3-데이터-관리-전략)
4. [서버 배포](#4-서버-배포)

---

## 1. 전체 아키텍처

### **배포할 컴포넌트**

```
CareMeal 시스템
├── 🐳 Backend (Docker 이미지)
│   ├── Python 코드
│   ├── FastAPI
│   └── DB 초기화 스크립트
│
├── 🐳 Frontend (Docker 이미지)
│   ├── React 빌드 결과
│   └── Nginx 설정
│
├── 📦 데이터 (별도 관리)
│   ├── caremeal.db (볼륨)
│   ├── static/*.png (S3 또는 볼륨)
│   └── .env (환경변수)
│
└── 🔧 Nginx (선택사항)
    └── 리버스 프록시
```

---

## 2. 이미지 빌드 & 푸시

### **Step 1: 모든 이미지 빌드**

```bash
# Docker Hub 사용자명 설정
DOCKER_USERNAME="your-dockerhub-username"
VERSION="v1.0.0"

# 1. 백엔드 이미지 빌드
docker build -f Dockerfile.backend \
  -t $DOCKER_USERNAME/caremeal-backend:$VERSION \
  -t $DOCKER_USERNAME/caremeal-backend:latest \
  .

# 2. 프론트엔드 이미지 빌드
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_URL=http://your-server-ip:8000 \
  -t $DOCKER_USERNAME/caremeal-frontend:$VERSION \
  -t $DOCKER_USERNAME/caremeal-frontend:latest \
  .

# 3. 이미지 확인
docker images | grep caremeal
```

### **Step 2: Docker Hub에 푸시**

```bash
# Docker Hub 로그인
docker login

# 백엔드 푸시
docker push $DOCKER_USERNAME/caremeal-backend:$VERSION
docker push $DOCKER_USERNAME/caremeal-backend:latest

# 프론트엔드 푸시
docker push $DOCKER_USERNAME/caremeal-frontend:$VERSION
docker push $DOCKER_USERNAME/caremeal-frontend:latest

echo "✅ All images pushed to Docker Hub!"
```

---

## 3. 데이터 관리 전략

### **문제: 레시피 데이터와 이미지를 어떻게 배포하나?**

#### **방법 A: 초기 데이터는 이미지에 포함 (추천 ⭐)**

```
이미지에 포함:
✅ migrations/data/recipes_initial.sql (INSERT 문만)
✅ scripts/init_db.py (DB 초기화 스크립트)

이미지에서 제외:
❌ caremeal.db (실제 DB 파일)
❌ static/*.png (이미지 파일)
```

**장점:**
- 이미지만 pull하면 바로 실행 가능
- 초기 레시피 데이터 자동 로드
- 사용자 데이터와 분리

**구현:**

```bash
# 1. 초기 레시피 SQL 생성
grep "^INSERT INTO recipes" recipes_export.sql > migrations/data/recipes_initial.sql

# 2. Dockerfile.backend 수정 (이미 포함되어 있음)
# COPY migrations/ /app/migrations/
# COPY scripts/ /app/scripts/

# 3. 컨테이너 시작 시 DB 초기화
docker run -d \
  -v $(pwd)/caremeal.db:/app/caremeal.db \
  your-username/caremeal-backend:latest \
  sh -c "python scripts/init_db.py && uvicorn main:app --host 0.0.0.0 --port 8000"
```

---

#### **방법 B: 이미지 파일 관리**

##### **옵션 1: AWS S3 사용 (프로덕션 권장 ⭐⭐⭐)**

```bash
# 로컬에서 S3 업로드
aws s3 sync static/ s3://caremeal-assets/static/ --acl public-read

# 코드에서 S3 URL 사용
# main.py
S3_BUCKET_URL = "https://caremeal-assets.s3.amazonaws.com"
image_url = f"{S3_BUCKET_URL}/static/{recipe_id:03d}.png"
```

**장점:**
- CDN 활용 가능 (빠른 로딩)
- 이미지 크기 무제한
- 백업 자동화
- Docker 이미지 크기 절감

---

##### **옵션 2: 볼륨 마운트 (개발/테스트)**

```bash
# 서버에 이미지 업로드
scp -i key.pem static/*.png ubuntu@server:/home/ubuntu/caremeal/static/

# Docker 실행 시 볼륨 마운트
docker run -d \
  -v /home/ubuntu/caremeal/static:/app/static \
  your-username/caremeal-backend:latest
```

---

##### **옵션 3: 이미지에 포함 (소규모만)**

```bash
# .dockerignore에서 static 제거
# static/*  <- 이 줄 주석 처리

# Dockerfile.backend에 추가
COPY static/ /app/static/

# 빌드
docker build -f Dockerfile.backend -t your-username/caremeal-backend:latest .
```

**단점:**
- 이미지 크기 증가 (29개 이미지 = 약 10MB)
- 이미지 추가 시 재빌드 필요
- 비효율적

---

## 4. 서버 배포

### **배포용 docker-compose.yml**

```yaml
version: '3.8'

services:
  backend:
    image: your-dockerhub-username/caremeal-backend:latest
    container_name: caremeal-backend
    ports:
      - "8000:8000"
    volumes:
      # DB 영속성
      - ./data/caremeal.db:/app/caremeal.db
      # 이미지 파일 (옵션 2 사용 시)
      - ./static:/app/static
    environment:
      - DB_PATH=/app/caremeal.db
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      # S3 사용 시
      - S3_BUCKET_URL=https://caremeal-assets.s3.amazonaws.com
    restart: unless-stopped
    command: >
      sh -c "
        if [ ! -f /app/caremeal.db ]; then
          echo '🔧 Initializing database...';
          python scripts/init_db.py;
        fi &&
        uvicorn main:app --host 0.0.0.0 --port 8000
      "

  frontend:
    image: your-dockerhub-username/caremeal-frontend:latest
    container_name: caremeal-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: caremeal-nginx
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped
```

---

### **서버 배포 절차**

```bash
# === 서버에서 실행 ===

# 1. 프로젝트 디렉토리 생성
mkdir -p ~/caremeal-deploy/{data,static}
cd ~/caremeal-deploy

# 2. docker-compose.yml 생성
cat > docker-compose.yml << 'EOF'
# (위의 docker-compose.yml 내용 붙여넣기)
EOF

# 3. 환경변수 설정
cat > .env << 'EOF'
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
VITE_API_URL=http://your-server-ip:8000
EOF

# 4. 이미지 파일 업로드 (옵션 2 사용 시)
# 로컬에서:
scp -i key.pem static/*.png ubuntu@server:~/caremeal-deploy/static/

# 또는 S3 사용 (옵션 1)
# 로컬에서:
aws s3 sync static/ s3://caremeal-assets/static/ --acl public-read

# 5. Docker 이미지 Pull
docker-compose pull

# 6. 서비스 시작
docker-compose up -d

# 7. 로그 확인
docker-compose logs -f

# 8. DB 초기화 확인
docker exec caremeal-backend python -c "
import sqlite3
conn = sqlite3.connect('/app/caremeal.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM recipes')
print(f'✅ Recipes loaded: {cursor.fetchone()[0]}')
conn.close()
"

# 9. 이미지 파일 확인
docker exec caremeal-backend ls -lh /app/static/*.png | wc -l
# 출력: 29 (29개 이미지)
```

---

## 📊 **데이터 관리 비교**

| 방법 | 레시피 데이터 | 이미지 파일 | 장점 | 단점 |
|------|-------------|------------|------|------|
| **A: 초기화 스크립트** | SQL 스크립트 | S3 | ⭐⭐⭐ 확장성 | 초기 설정 필요 |
| **B: 볼륨 마운트** | SQL 스크립트 | 볼륨 | ⭐⭐ 간단 | 서버 의존적 |
| **C: 이미지 포함** | SQL 스크립트 | 이미지 포함 | ⭐ 즉시 사용 | 이미지 크기 증가 |

---

## 🎯 **추천 전략 (프로덕션)**

### **1. 레시피 데이터**
```
✅ migrations/data/recipes_initial.sql (이미지에 포함)
✅ scripts/init_db.py (이미지에 포함)
✅ 컨테이너 시작 시 자동 초기화
```

### **2. 이미지 파일**
```
✅ AWS S3에 업로드
✅ CloudFront CDN 연결
✅ 코드에서 S3 URL 참조
```

### **3. 사용자 데이터**
```
✅ caremeal.db는 볼륨으로 마운트
✅ 정기 백업 (cron)
```

---

## 🚀 **완전 자동화 스크립트**

```bash
#!/bin/bash
# deploy.sh - 완전 자동 배포

set -e

DOCKER_USERNAME="your-dockerhub-username"
VERSION="v1.0.0"
SERVER="ubuntu@your-server-ip"
KEY_FILE="~/.ssh/caremeal.pem"

echo "🔨 Step 1: Building images..."
docker build -f Dockerfile.backend -t $DOCKER_USERNAME/caremeal-backend:$VERSION .
docker build -f Dockerfile.frontend -t $DOCKER_USERNAME/caremeal-frontend:$VERSION .

echo "🚀 Step 2: Pushing to Docker Hub..."
docker push $DOCKER_USERNAME/caremeal-backend:$VERSION
docker push $DOCKER_USERNAME/caremeal-frontend:$VERSION

echo "☁️  Step 3: Uploading images to S3..."
aws s3 sync static/ s3://caremeal-assets/static/ --acl public-read

echo "📦 Step 4: Deploying to server..."
ssh -i $KEY_FILE $SERVER << 'EOF'
  cd ~/caremeal-deploy
  docker-compose pull
  docker-compose up -d
  docker-compose logs --tail=50
EOF

echo "✅ Deployment complete!"
echo "🌐 Frontend: http://your-server-ip"
echo "🔧 Backend: http://your-server-ip:8000"
```

---

## 📝 **체크리스트**

### **배포 전**
- [ ] 백엔드 이미지 빌드 완료
- [ ] 프론트엔드 이미지 빌드 완료
- [ ] Docker Hub에 푸시 완료
- [ ] S3에 이미지 업로드 완료 (또는 볼륨 준비)
- [ ] 환경변수 설정 완료

### **배포 후**
- [ ] DB 초기화 확인 (29개 레시피)
- [ ] 이미지 로딩 확인
- [ ] API 응답 확인
- [ ] 프론트엔드 접속 확인
- [ ] 로그 확인

---

완료! 🎉
