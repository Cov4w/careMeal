# 🔄 코드 업데이트 & 재배포 가이드

## 📋 목차
1. [버전 관리 전략](#1-버전-관리-전략)
2. [코드 수정 후 재배포](#2-코드-수정-후-재배포)
3. [무중단 배포](#3-무중단-배포)
4. [롤백 방법](#4-롤백-방법)

---

## 1. 버전 관리 전략

### **시맨틱 버저닝 (Semantic Versioning)**

```
v1.2.3
│ │ │
│ │ └─ PATCH: 버그 수정
│ └─── MINOR: 기능 추가 (하위 호환)
└───── MAJOR: 큰 변경 (하위 호환 X)
```

**예시:**
- `v1.0.0` → 초기 배포
- `v1.0.1` → 버그 수정
- `v1.1.0` → 새 기능 추가
- `v2.0.0` → 대규모 리팩토링

---

## 2. 코드 수정 후 재배포

### **시나리오 A: 백엔드 코드 수정**

```bash
# === 로컬에서 ===

# 1. 코드 수정
vim main.py  # 또는 다른 파일

# 2. Git 커밋
git add .
git commit -m "fix: Fix recipe search bug"
git push deploy_private feature/deploy

# 3. 버전 업데이트
VERSION="v1.0.1"  # 버그 수정이므로 PATCH 증가

# 4. 이미지 재빌드
docker build -f Dockerfile.backend \
  -t your-username/caremeal-backend:$VERSION \
  -t your-username/caremeal-backend:latest \
  .

# 5. Docker Hub에 푸시
docker push your-username/caremeal-backend:$VERSION
docker push your-username/caremeal-backend:latest

# === 서버에서 ===

# 6. 새 이미지 Pull
docker pull your-username/caremeal-backend:latest

# 7. 컨테이너 재시작
docker-compose down
docker-compose up -d

# 또는 특정 서비스만 재시작
docker-compose up -d --no-deps --build backend

# 8. 로그 확인
docker-compose logs -f backend
```

---

### **시나리오 B: 프론트엔드 코드 수정**

```bash
# === 로컬에서 ===

# 1. 코드 수정
vim temp/src/App.tsx

# 2. Git 커밋
git add .
git commit -m "feat: Add new dashboard widget"
git push deploy_private feature/deploy

# 3. 버전 업데이트
VERSION="v1.1.0"  # 새 기능이므로 MINOR 증가

# 4. 이미지 재빌드
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_URL=http://your-server-ip:8000 \
  -t your-username/caremeal-frontend:$VERSION \
  -t your-username/caremeal-frontend:latest \
  .

# 5. Docker Hub에 푸시
docker push your-username/caremeal-frontend:$VERSION
docker push your-username/caremeal-frontend:latest

# === 서버에서 ===

# 6. 새 이미지 Pull & 재시작
docker pull your-username/caremeal-frontend:latest
docker-compose up -d --no-deps frontend

# 7. 확인
curl http://your-server-ip
```

---

### **시나리오 C: 둘 다 수정**

```bash
# === 로컬에서 ===

# 1. 코드 수정
git add .
git commit -m "feat: Add recipe recommendation feature"
git push deploy_private feature/deploy

# 2. 버전 업데이트
VERSION="v1.2.0"

# 3. 모든 이미지 재빌드
docker build -f Dockerfile.backend -t your-username/caremeal-backend:$VERSION .
docker build -f Dockerfile.frontend -t your-username/caremeal-frontend:$VERSION .

# 4. 푸시
docker push your-username/caremeal-backend:$VERSION
docker push your-username/caremeal-frontend:$VERSION

# === 서버에서 ===

# 5. 전체 재배포
docker-compose pull
docker-compose down
docker-compose up -d

# 6. 헬스체크
curl http://your-server-ip:8000/health
curl http://your-server-ip
```

---

## 3. 무중단 배포 (Zero-Downtime Deployment)

### **방법 A: Blue-Green Deployment**

```bash
# docker-compose.blue-green.yml
version: '3.8'

services:
  backend-blue:
    image: your-username/caremeal-backend:v1.0.0
    container_name: caremeal-backend-blue
    ports:
      - "8001:8000"
    # ... 설정 ...

  backend-green:
    image: your-username/caremeal-backend:v1.1.0
    container_name: caremeal-backend-green
    ports:
      - "8002:8000"
    # ... 설정 ...

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

**배포 절차:**

```bash
# 1. Green 버전 시작 (새 버전)
docker-compose up -d backend-green

# 2. 헬스체크
curl http://localhost:8002/health

# 3. Nginx 설정 변경 (Blue → Green)
# nginx-lb.conf에서 upstream 변경
# upstream backend {
#   server backend-green:8000;  # Blue → Green
# }

# 4. Nginx 리로드
docker exec caremeal-nginx nginx -s reload

# 5. Blue 버전 중지
docker-compose stop backend-blue

# 6. 문제 발생 시 롤백
# nginx-lb.conf를 Blue로 되돌리고 reload
```

---

### **방법 B: Rolling Update (docker-compose)**

```bash
# docker-compose.yml에 replicas 설정
version: '3.8'

services:
  backend:
    image: your-username/caremeal-backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first

# 배포
docker stack deploy -c docker-compose.yml caremeal
```

---

## 4. 롤백 방법

### **방법 A: 이전 버전으로 롤백**

```bash
# 1. 이전 버전 확인
docker images | grep caremeal-backend

# 2. 특정 버전으로 롤백
docker pull your-username/caremeal-backend:v1.0.0

# 3. docker-compose.yml 수정
# image: your-username/caremeal-backend:v1.0.0

# 4. 재시작
docker-compose up -d backend

# 또는 한 줄로
docker-compose pull && docker-compose up -d
```

---

### **방법 B: Git 태그 활용**

```bash
# 배포 시 Git 태그 생성
git tag -a v1.1.0 -m "Release v1.1.0"
git push deploy_private v1.1.0

# 롤백 시
git checkout v1.0.0
docker build -f Dockerfile.backend -t your-username/caremeal-backend:rollback .
docker push your-username/caremeal-backend:rollback

# 서버에서
docker pull your-username/caremeal-backend:rollback
# docker-compose.yml에서 이미지 변경 후
docker-compose up -d
```

---

## 🚀 **자동화 스크립트**

### **update.sh - 코드 업데이트 자동화**

```bash
#!/bin/bash
# update.sh - 코드 수정 후 자동 재배포

set -e

DOCKER_USERNAME="your-dockerhub-username"
COMPONENT=${1:-all}  # backend, frontend, or all
VERSION=${2:-latest}

echo "🔄 Updating CareMeal - Component: $COMPONENT, Version: $VERSION"

# 1. Git 상태 확인
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Uncommitted changes detected!"
    git status -s
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. 이미지 빌드
if [[ $COMPONENT == "backend" || $COMPONENT == "all" ]]; then
    echo "🔨 Building backend..."
    docker build -f Dockerfile.backend \
        -t $DOCKER_USERNAME/caremeal-backend:$VERSION \
        -t $DOCKER_USERNAME/caremeal-backend:latest \
        .
    docker push $DOCKER_USERNAME/caremeal-backend:$VERSION
    docker push $DOCKER_USERNAME/caremeal-backend:latest
fi

if [[ $COMPONENT == "frontend" || $COMPONENT == "all" ]]; then
    echo "🔨 Building frontend..."
    docker build -f Dockerfile.frontend \
        -t $DOCKER_USERNAME/caremeal-frontend:$VERSION \
        -t $DOCKER_USERNAME/caremeal-frontend:latest \
        .
    docker push $DOCKER_USERNAME/caremeal-frontend:$VERSION
    docker push $DOCKER_USERNAME/caremeal-frontend:latest
fi

echo "✅ Images pushed to Docker Hub"

# 3. 서버 배포 (선택사항)
read -p "Deploy to server? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SERVER="ubuntu@your-server-ip"
    KEY_FILE="~/.ssh/caremeal.pem"
    
    echo "🚀 Deploying to server..."
    ssh -i $KEY_FILE $SERVER << EOF
        cd ~/caremeal-deploy
        docker-compose pull
        docker-compose up -d
        docker-compose logs --tail=20
EOF
    echo "✅ Deployment complete!"
fi
```

**사용법:**

```bash
# 백엔드만 업데이트
./update.sh backend v1.0.1

# 프론트엔드만 업데이트
./update.sh frontend v1.1.0

# 전체 업데이트
./update.sh all v1.2.0
```

---

### **rollback.sh - 롤백 자동화**

```bash
#!/bin/bash
# rollback.sh - 이전 버전으로 롤백

set -e

DOCKER_USERNAME="your-dockerhub-username"
COMPONENT=${1:-all}
VERSION=${2}

if [[ -z $VERSION ]]; then
    echo "❌ Error: Version required"
    echo "Usage: ./rollback.sh [backend|frontend|all] [version]"
    echo "Example: ./rollback.sh backend v1.0.0"
    exit 1
fi

echo "⏪ Rolling back to version $VERSION"

SERVER="ubuntu@your-server-ip"
KEY_FILE="~/.ssh/caremeal.pem"

ssh -i $KEY_FILE $SERVER << EOF
    cd ~/caremeal-deploy
    
    # docker-compose.yml 백업
    cp docker-compose.yml docker-compose.yml.backup
    
    # 버전 변경
    if [[ $COMPONENT == "backend" || $COMPONENT == "all" ]]; then
        sed -i "s|caremeal-backend:.*|caremeal-backend:$VERSION|g" docker-compose.yml
    fi
    
    if [[ $COMPONENT == "frontend" || $COMPONENT == "all" ]]; then
        sed -i "s|caremeal-frontend:.*|caremeal-frontend:$VERSION|g" docker-compose.yml
    fi
    
    # 재배포
    docker-compose pull
    docker-compose up -d
    
    echo "✅ Rolled back to $VERSION"
    docker-compose ps
EOF
```

---

## 📊 **업데이트 체크리스트**

### **배포 전**
- [ ] 코드 변경사항 Git 커밋
- [ ] 로컬에서 테스트 완료
- [ ] 버전 번호 결정 (MAJOR.MINOR.PATCH)
- [ ] CHANGELOG 업데이트
- [ ] 이미지 빌드 성공 확인

### **배포 중**
- [ ] Docker Hub 푸시 완료
- [ ] 서버에서 이미지 Pull 완료
- [ ] 컨테이너 재시작 완료
- [ ] 헬스체크 통과

### **배포 후**
- [ ] 로그 확인 (에러 없음)
- [ ] API 응답 확인
- [ ] 프론트엔드 접속 확인
- [ ] 데이터베이스 정상 작동
- [ ] 모니터링 확인

---

## 🎯 **빠른 참조**

```bash
# === 코드 수정 후 ===

# 1. 백엔드만 업데이트
docker build -f Dockerfile.backend -t user/caremeal-backend:latest .
docker push user/caremeal-backend:latest
# 서버: docker-compose up -d --no-deps backend

# 2. 프론트엔드만 업데이트
docker build -f Dockerfile.frontend -t user/caremeal-frontend:latest .
docker push user/caremeal-frontend:latest
# 서버: docker-compose up -d --no-deps frontend

# 3. 전체 업데이트
docker-compose build
docker-compose push
# 서버: docker-compose pull && docker-compose up -d

# 4. 롤백
# docker-compose.yml에서 버전 변경 후
docker-compose up -d
```

---

완료! 🎉
