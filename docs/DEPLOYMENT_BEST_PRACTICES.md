# 🏢 실무 배포 전략 가이드

## 📋 목차
1. [Git 커밋 정리](#1-git-커밋-정리)
2. [브랜치 전략](#2-브랜치-전략)
3. [데이터 관리](#3-데이터-관리)
4. [CI/CD 파이프라인](#4-cicd-파이프라인)
5. [현재 프로젝트 개선안](#5-현재-프로젝트-개선안)

---

## 1. Git 커밋 정리

### ❌ **현재 문제**
```
feat: Add recipes
fix: typo
fix: another typo
feat: Add more recipes
docs: Update guide
fix: Fix guide
feat: Add scripts
...
```

### ✅ **개선 방법**

#### **방법 A: Interactive Rebase (커밋 합치기)**

```bash
# 최근 10개 커밋 확인
git log --oneline -10

# Interactive rebase 시작
git rebase -i HEAD~10

# 에디터에서:
# pick abc1234 feat: Add recipe system
# squash def5678 fix: typo
# squash ghi9012 feat: Add more recipes
# squash jkl3456 docs: Update guide

# 결과: 하나의 깔끔한 커밋
# "feat: Add recipe management system with 29 recipes and documentation"

# Force push (feature 브랜치에서만!)
git push deploy_private feature/deploy --force
```

#### **방법 B: 새 브랜치로 재시작**

```bash
# 1. 현재 변경사항 확인
git diff develop...feature/deploy > changes.patch

# 2. 깔끔한 새 브랜치 생성
git checkout develop
git checkout -b feature/deploy-clean

# 3. 변경사항 한 번에 적용
git apply changes.patch

# 4. 의미 있는 커밋으로 정리
git add migrations/ scripts/ docs/
git commit -m "feat: Add database migration system"

git add Dockerfile.backend
git commit -m "feat: Add sqlite3 to backend Docker image"

git add static/
git commit -m "feat: Add recipe images (29 images)"

# 5. 푸시
git push deploy_private feature/deploy-clean
```

---

## 2. 브랜치 전략

### **Git Flow (대규모 프로젝트)**

```
main (production)
  ├── v1.0.0
  ├── v1.1.0
  └── v1.2.0
  ↑
develop (staging)
  ↑
feature/recipe-system
feature/user-auth
feature/payment
```

**워크플로우:**
```bash
# 개발
git checkout -b feature/recipe-system develop
# ... 작업 ...
git commit -m "feat: Add recipe CRUD"

# 테스트 (develop에 머지)
git checkout develop
git merge --no-ff feature/recipe-system
git push origin develop
# → 스테이징 서버 자동 배포

# 배포 (main에 머지)
git checkout main
git merge --no-ff develop
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin main --tags
# → 프로덕션 서버 자동 배포
```

### **GitHub Flow (소규모/빠른 배포)**

```
main (production)
  ↑
feature/recipe-system (PR)
feature/new-ui (PR)
```

**워크플로우:**
```bash
# 1. Feature 브랜치 생성
git checkout -b feature/recipe-system main

# 2. 작업 & 커밋
git commit -m "feat: Add recipe system"

# 3. Pull Request 생성
git push origin feature/recipe-system
# → GitHub에서 PR 생성

# 4. 코드 리뷰 후 머지
# → main에 머지되면 자동 배포
```

---

## 3. 데이터 관리

### ❌ **Git에 데이터 넣지 않기**

```bash
# 나쁜 예
git add caremeal.db
git add static/*.png
git add recipes_export.sql
```

### ✅ **올바른 데이터 관리**

#### **A. 이미지 → 클라우드 스토리지**

```bash
# AWS S3
aws s3 sync static/ s3://caremeal-assets/static/ --acl public-read

# Cloudinary (이미지 CDN)
# 환경변수로 URL 관리
CLOUDINARY_URL=https://res.cloudinary.com/caremeal/image/upload/

# 코드에서:
image_url = f"{CLOUDINARY_URL}/recipes/{recipe_id}.png"
```

#### **B. DB 데이터 → 마이그레이션**

```bash
# 마이그레이션 파일 생성
migrations/
  ├── 001_add_initial_recipes.py
  ├── 002_add_new_recipes.py
  └── migrate.py

# 사용법
python migrations/migrate.py up      # 적용
python migrations/migrate.py down    # 롤백
python migrations/migrate.py status  # 상태 확인
```

---

## 4. CI/CD 파이프라인

### **GitHub Actions 예시**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Server
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
        run: |
          # SSH 설정
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          
          # 배포
          ssh ubuntu@$SERVER_HOST << 'EOF'
            cd ~/caremeal/careMeal-deploy
            git pull origin main
            docker-compose down
            docker-compose build
            docker-compose up -d
            
            # 마이그레이션 실행
            docker exec caremeal-backend python migrations/migrate.py up
          EOF
```

---

## 5. 현재 프로젝트 개선안

### **즉시 적용 가능한 개선**

#### **Step 1: 커밋 정리**

```bash
# 현재 feature/deploy 브랜치 정리
git checkout feature/deploy
git rebase -i HEAD~20  # 최근 20개 커밋 정리

# 또는 새 브랜치로 재시작
git checkout -b feature/deploy-v2 develop
# 변경사항 한 번에 커밋
```

#### **Step 2: 데이터 분리**

```bash
# .gitignore 업데이트
echo "recipes_export.sql" >> .gitignore
echo "static/*.png" >> .gitignore
echo "*.db" >> .gitignore

# 이미 추가된 파일 제거
git rm --cached recipes_export.sql
git rm --cached static/*.png
git commit -m "chore: Remove data files from Git"
```

#### **Step 3: 마이그레이션 시스템 도입**

```bash
# 마이그레이션 파일만 Git에 추가
git add migrations/
git commit -m "feat: Add database migration system"

# 서버에서 사용
docker exec caremeal-backend python migrations/migrate.py up
```

#### **Step 4: 배포 스크립트 작성**

```bash
# deploy.sh
#!/bin/bash
set -e

echo "🚀 Deploying CareMeal..."

# 1. 코드 업데이트
git pull deploy_private main

# 2. Docker 재빌드
docker-compose build --no-cache

# 3. 서비스 재시작
docker-compose down
docker-compose up -d

# 4. 마이그레이션 실행
docker exec caremeal-backend python migrations/migrate.py up

# 5. 헬스체크
sleep 10
curl -f http://localhost:8000/health || exit 1

echo "✅ Deployment complete!"
```

---

## 📊 **비교: 현재 vs 개선안**

| 항목 | 현재 방식 | 개선안 |
|------|----------|--------|
| **커밋** | 지저분한 다수 커밋 | Squash로 정리된 커밋 |
| **데이터** | Git에 포함 | 클라우드/마이그레이션 |
| **배포** | 수동 명령어 실행 | 자동화 스크립트/CI/CD |
| **롤백** | 어려움 | 마이그레이션 down |
| **협업** | 충돌 가능성 높음 | 브랜치 전략으로 관리 |

---

## 🎯 **추천 워크플로우 (현재 프로젝트)**

### **단기 (지금 당장)**
1. ✅ 커밋 정리 (rebase -i)
2. ✅ 데이터 파일 .gitignore 추가
3. ✅ 배포 스크립트 작성

### **중기 (다음 스프린트)**
1. 마이그레이션 시스템 도입
2. 이미지 S3 업로드
3. GitHub Actions 설정

### **장기 (프로덕션 준비)**
1. Git Flow 브랜치 전략 적용
2. 스테이징/프로덕션 환경 분리
3. 모니터링 & 로깅 시스템

---

## 💡 **핵심 원칙**

1. **코드만 Git에**: 데이터는 별도 관리
2. **의미 있는 커밋**: Squash로 정리
3. **자동화**: 수동 작업 최소화
4. **롤백 가능**: 언제든 이전 버전으로
5. **환경 분리**: dev/staging/production

---

이제 더 전문적이고 관리하기 쉬운 배포 시스템을 갖추게 되었습니다! 🚀
