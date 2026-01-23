# 🚀 CareMeal 레시피 배포 완전 가이드

## 📋 목차
1. [초기 배포: recipes 테이블 업로드](#1-초기-배포-recipes-테이블-업로드)
2. [나중에 레시피 추가하는 상황](#2-나중에-레시피-추가하는-상황)
3. [트러블슈팅](#3-트러블슈팅)

---

## 1. 초기 배포: recipes 테이블 업로드

### 📍 **현재 상황**
- 브랜치: `feature/deploy` (Docker 배포 테스트 중)
- 로컬 DB: `caremeal.db` (29개 레시피 포함)
- 서버: EC2 또는 클라우드 서버에 Docker로 배포 중
- 목표: **로컬의 recipes 테이블만 서버에 업로드**

---

### 🔹 **Step 1: 로컬에서 recipes 테이블 Export**

```bash
# 현재 위치 확인
cd /Users/cov4/careMeal

# recipes 테이블만 SQL 파일로 추출 (이미 완료됨)
sqlite3 caremeal.db ".dump recipes" > recipes_export.sql

# 확인: 파일이 생성되었는지 체크
ls -lh recipes_export.sql
# 출력 예시: -rw-r--r--  1 cov4  staff    27K Jan 23 09:37 recipes_export.sql

# 내용 미리보기 (처음 20줄)
head -n 20 recipes_export.sql
```

**✅ 결과**: `recipes_export.sql` 파일 생성 완료 (27KB, 29개 레시피)

---

### 🔹 **Step 2: Git에 커밋 (버전 관리)**

```bash
# 현재 브랜치 확인
git branch
# 출력: * feature/deploy

# recipes_export.sql을 Git에 추가
git add recipes_export.sql

# 관리 스크립트와 문서도 함께 추가
git add scripts/add_new_recipes.sh
git add scripts/sync_recipes.sh
git add docs/RECIPE_MANAGEMENT.md

# 커밋
git commit -m "feat: Add initial recipes data (29 recipes) and management scripts"

# 원격 저장소에 푸시 (배포용 private 저장소)
git push deploy_private feature/deploy
```

**✅ 결과**: 레시피 데이터가 Git에 저장되어 버전 관리 시작

---

### 🔹 **Step 3: 서버에 접속**

```bash
# SSH로 서버 접속 (예시)
ssh ubuntu@your-server-ip

# 또는 EC2 키 파일 사용
ssh -i ~/.ssh/your-key.pem ubuntu@your-server-ip
```

**서버 접속 후 작업 시작** ⬇️

---

### 🔹 **Step 4: 서버에서 Git Pull**

```bash
# 서버에서 프로젝트 디렉토리로 이동
cd /home/ubuntu/careMeal  # 실제 경로로 변경

# 최신 코드 가져오기
git pull deploy_private feature/deploy

# recipes_export.sql 파일 확인
ls -lh recipes_export.sql
```

**✅ 결과**: 서버에 `recipes_export.sql` 파일 준비 완료

---

### 🔹 **Step 5: Docker 컨테이너 확인**

```bash
# 실행 중인 컨테이너 확인
docker ps

# 출력 예시:
# CONTAINER ID   IMAGE              COMMAND       NAMES
# abc123def456   caremeal-backend   "python..."   caremeal-backend
# def789ghi012   caremeal-frontend  "npm..."      caremeal-frontend

# 백엔드 컨테이너 이름 확인 (예: caremeal-backend)
```

---

### 🔹 **Step 6: 서버 DB 백업 (중요!)**

```bash
# 방법 1: 컨테이너 내부에서 백업
docker exec caremeal-backend sqlite3 /app/caremeal.db ".backup /app/caremeal_backup_$(date +%Y%m%d).db"

# 방법 2: 호스트로 백업 파일 복사
docker cp caremeal-backend:/app/caremeal.db ./caremeal_backup_$(date +%Y%m%d).db

# 백업 확인
ls -lh caremeal_backup_*.db
```

**✅ 결과**: 기존 DB 백업 완료 (문제 발생 시 복구 가능)

---

### 🔹 **Step 7: recipes 테이블에 데이터 Import**

```bash
# 방법 1: 호스트에서 직접 실행 (추천)
docker exec caremeal-backend sqlite3 /app/caremeal.db "DELETE FROM recipes;"
docker exec -i caremeal-backend sqlite3 /app/caremeal.db < recipes_export.sql

# 방법 2: 파일을 컨테이너에 복사 후 실행
docker cp recipes_export.sql caremeal-backend:/app/
docker exec caremeal-backend sqlite3 /app/caremeal.db "DELETE FROM recipes;"
docker exec caremeal-backend sqlite3 /app/caremeal.db < /app/recipes_export.sql
```

**✅ 결과**: 서버 DB에 29개 레시피 업로드 완료

---

### 🔹 **Step 8: 검증**

```bash
# 레시피 개수 확인
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT COUNT(*) FROM recipes;"
# 출력: 29

# 처음 5개 레시피 이름 확인
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT id, name FROM recipes LIMIT 5;"
# 출력:
# 1|저칼륨 배추 고기 롤
# 2|맑은 무 계란 흰자 국
# 3|레몬 허브 대구찜
# 4|양파 파프리카 당면 볶음
# 5|소고기 채소 무나물

# 마지막 레시피 ID 확인
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT MAX(id) FROM recipes;"
# 출력: 30 (또는 29)
```

---

### 🔹 **Step 9: 이미지 파일 업로드 (필요시)**

레시피 DB에는 `/static/001.png` 같은 경로만 저장되어 있으므로, 실제 이미지 파일도 업로드해야 합니다.

```bash
# 로컬에서 이미지 파일 확인
ls /Users/cov4/careMeal/static/*.png

# 서버로 이미지 전송 (로컬 터미널에서 실행)
scp /Users/cov4/careMeal/static/*.png ubuntu@your-server-ip:/home/ubuntu/careMeal/static/

# 또는 Docker 볼륨에 직접 복사
# (서버에서)
docker cp /home/ubuntu/careMeal/static caremeal-backend:/app/
```

---

### 🔹 **Step 10: 프론트엔드에서 확인**

```bash
# 브라우저에서 접속
# http://your-server-ip:3000 (또는 설정한 포트)

# 레시피 페이지로 이동하여 29개 레시피가 표시되는지 확인
```

**✅ 초기 배포 완료!** 🎉

---

## 2. 나중에 레시피 추가하는 상황

### 📍 **상황 설정**
- 시간: 2주 후
- 현재 서버: 29개 레시피 운영 중
- 목표: 새로운 레시피 5개 추가 (ID 31~35)

---

### 🔹 **Step 1: 로컬 DB에 새 레시피 추가**

```bash
# 로컬에서 작업
cd /Users/cov4/careMeal

# 현재 마지막 레시피 ID 확인
sqlite3 caremeal.db "SELECT MAX(id) FROM recipes;"
# 출력: 30

# 새 레시피 추가 (Python 스크립트, SQL, 또는 수동 입력)
# 예시: ID 31~35로 5개 레시피 추가

# 추가 후 확인
sqlite3 caremeal.db "SELECT COUNT(*) FROM recipes;"
# 출력: 35 (29 + 5 + 1 = 35개)
```

---

### 🔹 **Step 2-A: 증분 업데이트 (새 레시피만 추가) - 추천 ⭐**

```bash
# 새 레시피만 export (ID 31부터)
./scripts/add_new_recipes.sh 31

# 또는 수동으로:
sqlite3 caremeal.db <<EOF > new_recipes.sql
.mode insert recipes
SELECT * FROM recipes WHERE id >= 31;
EOF

# 생성된 파일 확인
cat new_recipes.sql
# 출력: INSERT INTO recipes VALUES(31,...), (32,...), ...

# Git에 커밋
git add new_recipes.sql
git commit -m "feat: Add 5 new recipes (ID 31-35) for diabetes"
git push deploy_private feature/deploy
```

**서버 작업** ⬇️

```bash
# 서버 접속
ssh ubuntu@your-server-ip

# Git pull
cd /home/ubuntu/careMeal
git pull deploy_private feature/deploy

# 새 레시피만 추가 (기존 데이터 유지)
docker exec -i caremeal-backend sqlite3 /app/caremeal.db < new_recipes.sql

# 확인
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT COUNT(*) FROM recipes;"
# 출력: 35

docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT id, name FROM recipes WHERE id >= 31;"
# 출력: 새로 추가된 5개 레시피 목록
```

**✅ 장점**: 빠르고 안전, 기존 데이터 영향 없음

---

### 🔹 **Step 2-B: 전체 동기화 (기존 레시피 수정 시)**

기존 레시피를 수정했거나 완전히 동기화하고 싶을 때 사용합니다.

```bash
# 로컬에서 전체 export
./scripts/sync_recipes.sh

# 또는 수동으로:
sqlite3 caremeal.db ".dump recipes" > recipes_full_sync.sql

# Git에 커밋
git add recipes_full_sync.sql
git commit -m "feat: Update recipes - modify existing + add 5 new (total 35)"
git push deploy_private feature/deploy
```

**서버 작업** ⬇️

```bash
# 서버 접속 및 pull
ssh ubuntu@your-server-ip
cd /home/ubuntu/careMeal
git pull deploy_private feature/deploy

# ⚠️ 백업 먼저!
docker exec caremeal-backend sqlite3 /app/caremeal.db ".backup /app/backup_$(date +%Y%m%d_%H%M%S).db"

# 기존 레시피 삭제 후 전체 재적용
docker exec caremeal-backend sqlite3 /app/caremeal.db "DELETE FROM recipes;"
docker exec -i caremeal-backend sqlite3 /app/caremeal.db < recipes_full_sync.sql

# 확인
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT COUNT(*) FROM recipes;"
# 출력: 35
```

**✅ 장점**: 완전 동기화, 수정 사항 반영  
**⚠️ 주의**: 기존 데이터 전체 교체

---

### 🔹 **Step 3: 새 이미지 파일 업로드**

```bash
# 로컬에서 새 이미지 확인
ls /Users/cov4/careMeal/static/031.png
ls /Users/cov4/careMeal/static/032.png
# ... (035.png까지)

# 서버로 전송
scp /Users/cov4/careMeal/static/03*.png ubuntu@your-server-ip:/home/ubuntu/careMeal/static/

# Docker 컨테이너에 복사 (필요시)
docker cp /home/ubuntu/careMeal/static/031.png caremeal-backend:/app/static/
docker cp /home/ubuntu/careMeal/static/032.png caremeal-backend:/app/static/
# ... 또는 전체 디렉토리 복사
docker cp /home/ubuntu/careMeal/static/. caremeal-backend:/app/static/
```

---

### 🔹 **Step 4: 검증 및 테스트**

```bash
# 1. DB 검증
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT id, name FROM recipes ORDER BY id DESC LIMIT 5;"
# 출력: 최근 추가된 5개 레시피

# 2. 이미지 파일 확인
docker exec caremeal-backend ls -lh /app/static/03*.png

# 3. 프론트엔드에서 확인
# 브라우저: http://your-server-ip:3000/recipes
# 새 레시피 5개가 표시되는지 확인
# 이미지가 정상적으로 로드되는지 확인
```

**✅ 레시피 추가 완료!** 🎉

---

## 3. 트러블슈팅

### ❌ **문제 1: "UNIQUE constraint failed: recipes.id"**

```bash
# 원인: 동일한 ID가 이미 존재
# 해결: 기존 레시피 확인 후 삭제 또는 ID 변경

# 기존 레시피 확인
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT id FROM recipes WHERE id >= 31;"

# 특정 ID 삭제
docker exec caremeal-backend sqlite3 /app/caremeal.db "DELETE FROM recipes WHERE id >= 31;"

# 다시 import
docker exec -i caremeal-backend sqlite3 /app/caremeal.db < new_recipes.sql
```

---

### ❌ **문제 2: 이미지가 표시되지 않음**

```bash
# 원인: 이미지 파일이 서버에 없음
# 해결: 이미지 파일 경로 확인 및 업로드

# 이미지 경로 확인
docker exec caremeal-backend ls -lh /app/static/

# 누락된 이미지 업로드
scp /Users/cov4/careMeal/static/*.png ubuntu@your-server-ip:/path/to/static/
```

---

### ❌ **문제 3: 서버 DB가 잠겨있음 (database is locked)**

```bash
# 원인: 다른 프로세스가 DB를 사용 중
# 해결: 백엔드 서비스 재시작

# 컨테이너 재시작
docker restart caremeal-backend

# 또는 전체 재시작
docker-compose restart
```

---

### ❌ **문제 4: 백업에서 복구해야 할 때**

```bash
# 백업 파일 확인
docker exec caremeal-backend ls -lh /app/caremeal_backup_*.db

# 백업에서 복구
docker exec caremeal-backend cp /app/caremeal_backup_20260123.db /app/caremeal.db

# 서비스 재시작
docker restart caremeal-backend
```

---

## 📊 **전체 흐름 요약**

### **초기 배포**
```
로컬 DB (29개) 
  → Export (recipes_export.sql)
  → Git Push
  → 서버 Pull
  → Docker Import
  → 서버 DB (29개) ✅
```

### **레시피 추가**
```
로컬 DB (35개)
  → Export 새 레시피 (new_recipes.sql)
  → Git Push
  → 서버 Pull
  → Docker Import (증분)
  → 서버 DB (35개) ✅
```

### **전체 동기화**
```
로컬 DB 수정
  → Export 전체 (recipes_full_sync.sql)
  → Git Push
  → 서버 Pull
  → 백업
  → Docker Import (전체 교체)
  → 서버 DB 동기화 ✅
```

---

## 🎯 **핵심 명령어 치트시트**

```bash
# === 로컬 작업 ===
# 전체 export
sqlite3 caremeal.db ".dump recipes" > recipes_export.sql

# 새 레시피만 export (ID 31부터)
./scripts/add_new_recipes.sh 31

# Git 커밋 & 푸시
git add recipes_export.sql
git commit -m "Update recipes"
git push deploy_private feature/deploy

# === 서버 작업 ===
# Pull 최신 코드
git pull deploy_private feature/deploy

# 백업
docker exec caremeal-backend sqlite3 /app/caremeal.db ".backup /app/backup.db"

# Import (증분)
docker exec -i caremeal-backend sqlite3 /app/caremeal.db < new_recipes.sql

# Import (전체 교체)
docker exec caremeal-backend sqlite3 /app/caremeal.db "DELETE FROM recipes;"
docker exec -i caremeal-backend sqlite3 /app/caremeal.db < recipes_export.sql

# 검증
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT COUNT(*) FROM recipes;"
```

---

이제 처음부터 끝까지 완벽하게 레시피를 관리할 수 있습니다! 🚀
