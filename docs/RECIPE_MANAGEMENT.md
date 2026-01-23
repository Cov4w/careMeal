# 레시피 관리 가이드

## 📚 개요
이 문서는 CareMeal 프로젝트의 레시피 데이터를 로컬과 서버 간에 동기화하는 방법을 설명합니다.

## 🎯 시나리오별 가이드

### 1️⃣ **새 레시피 추가 (증분 업데이트)**

로컬에서 새 레시피를 추가한 후, 서버에 새 레시피만 업로드하는 방법입니다.

#### 로컬 작업:
```bash
# 1. 현재 서버의 마지막 레시피 ID 확인 (예: 29)
# 2. 로컬에서 새 레시피 추가 (ID 30, 31, 32...)
# 3. 새 레시피만 export
./scripts/add_new_recipes.sh 30

# 또는 수동으로:
sqlite3 caremeal.db ".mode insert recipes" > new_recipes.sql
sqlite3 caremeal.db "SELECT * FROM recipes WHERE id >= 30;" >> new_recipes.sql
```

#### 서버 작업:
```bash
# 1. 파일 전송
scp new_recipes.sql user@server:/path/to/app/

# 2. 서버에서 적용
sqlite3 caremeal.db < new_recipes.sql

# Docker 환경:
docker cp new_recipes.sql container_name:/app/
docker exec -i container_name sqlite3 /app/caremeal.db < /app/new_recipes.sql
```

---

### 2️⃣ **전체 레시피 동기화 (전체 교체)**

기존 레시피를 수정했거나 전체를 다시 동기화해야 할 때 사용합니다.

#### 로컬 작업:
```bash
# 전체 레시피 export
./scripts/sync_recipes.sh

# 또는 수동으로:
sqlite3 caremeal.db ".dump recipes" > recipes_full_sync.sql
```

#### 서버 작업:
```bash
# ⚠️ 주의: 기존 레시피가 모두 삭제됩니다!

# 1. 백업 먼저!
sqlite3 caremeal.db ".backup caremeal_backup_$(date +%Y%m%d).db"

# 2. 파일 전송
scp recipes_full_sync.sql user@server:/path/to/app/

# 3. 기존 데이터 삭제 후 적용
sqlite3 caremeal.db "DELETE FROM recipes;"
sqlite3 caremeal.db < recipes_full_sync.sql

# Docker 환경:
docker cp recipes_full_sync.sql container_name:/app/
docker exec container_name sqlite3 /app/caremeal.db "DELETE FROM recipes;"
docker exec -i container_name sqlite3 /app/caremeal.db < /app/recipes_full_sync.sql
```

---

### 3️⃣ **Git을 통한 버전 관리 (추천 ⭐⭐⭐)**

레시피 데이터를 Git으로 관리하면 변경 이력 추적이 가능합니다.

#### 초기 설정:
```bash
# 1. 레시피 데이터를 Git에 포함
git add recipes_export.sql
git commit -m "Initial recipes data (29 recipes)"
git push origin feature/deploy
```

#### 레시피 추가 시:
```bash
# 1. 로컬에서 레시피 추가
# 2. Export
sqlite3 caremeal.db ".dump recipes" > recipes_export.sql

# 3. Git에 커밋
git add recipes_export.sql
git commit -m "Add new recipes: ID 30-35"
git push origin feature/deploy

# 4. 서버에서 pull 후 적용
# (서버에서)
git pull origin feature/deploy
sqlite3 caremeal.db "DELETE FROM recipes;"
sqlite3 caremeal.db < recipes_export.sql
```

---

## 🔧 유용한 명령어

### 레시피 개수 확인
```bash
# 로컬
sqlite3 caremeal.db "SELECT COUNT(*) FROM recipes;"

# 서버
ssh user@server "sqlite3 /path/to/caremeal.db 'SELECT COUNT(*) FROM recipes;'"

# Docker
docker exec container_name sqlite3 /app/caremeal.db "SELECT COUNT(*) FROM recipes;"
```

### 마지막 레시피 ID 확인
```bash
sqlite3 caremeal.db "SELECT MAX(id) FROM recipes;"
```

### 특정 ID 범위의 레시피만 보기
```bash
sqlite3 caremeal.db "SELECT id, name FROM recipes WHERE id >= 30;"
```

### 레시피 차이 확인
```bash
# 로컬과 서버의 레시피 개수 비교
LOCAL_COUNT=$(sqlite3 caremeal.db "SELECT COUNT(*) FROM recipes;")
SERVER_COUNT=$(ssh user@server "sqlite3 /path/to/caremeal.db 'SELECT COUNT(*) FROM recipes;'")
echo "Local: $LOCAL_COUNT, Server: $SERVER_COUNT"
```

---

## 📋 체크리스트

### 새 레시피 추가 전:
- [ ] 서버의 현재 레시피 개수 확인
- [ ] 새 레시피 ID가 중복되지 않는지 확인
- [ ] 이미지 파일도 함께 업로드 필요 (`/static/*.png`)

### 서버 적용 전:
- [ ] 서버 DB 백업 완료
- [ ] 테스트 환경에서 먼저 검증
- [ ] user_preferences 테이블에 영향 없는지 확인 (외래키)

### 적용 후:
- [ ] 레시피 개수 확인
- [ ] 프론트엔드에서 새 레시피 표시 확인
- [ ] 이미지 로딩 확인

---

## ⚠️ 주의사항

1. **user_preferences 테이블 주의**
   - `user_preferences`는 `recipe_id`를 외래키로 참조합니다
   - 레시피를 삭제하면 사용자 선호도 데이터도 영향을 받을 수 있습니다

2. **이미지 파일 동기화**
   - 레시피 DB만 업데이트하면 이미지가 없을 수 있습니다
   - `/static/*.png` 파일도 함께 업로드해야 합니다

3. **ID 관리**
   - 레시피 ID는 자동 증가(AUTO INCREMENT)가 아닙니다
   - 수동으로 ID를 관리해야 충돌을 방지할 수 있습니다

---

## 🚀 자동화 (선택사항)

### GitHub Actions를 통한 자동 배포

`.github/workflows/deploy-recipes.yml`:
```yaml
name: Deploy Recipes

on:
  push:
    branches: [feature/deploy]
    paths:
      - 'recipes_export.sql'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Server
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
        run: |
          # SSH 설정
          mkdir -p ~/.ssh
          echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          
          # 파일 전송 및 적용
          scp recipes_export.sql $SERVER_USER@$SERVER_HOST:/tmp/
          ssh $SERVER_USER@$SERVER_HOST << 'EOF'
            docker exec caremeal-backend sqlite3 /app/caremeal.db "DELETE FROM recipes;"
            docker exec -i caremeal-backend sqlite3 /app/caremeal.db < /tmp/recipes_export.sql
            echo "✅ Recipes updated successfully"
          EOF
```

---

## 📞 문제 해결

### "UNIQUE constraint failed" 에러
```bash
# 원인: 동일한 ID의 레시피가 이미 존재
# 해결: 기존 레시피 삭제 후 다시 시도
sqlite3 caremeal.db "DELETE FROM recipes WHERE id >= 30;"
sqlite3 caremeal.db < new_recipes.sql
```

### 이미지가 표시되지 않음
```bash
# 이미지 파일 확인
ls -la /static/*.png

# 이미지 파일 전송
scp /static/*.png user@server:/path/to/static/
```
