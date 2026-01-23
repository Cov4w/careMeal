# 🔧 서버에서 레시피 Import 실행 가이드

## ⚠️ 중요: sqlite3가 컨테이너에 없는 경우

Docker 컨테이너에 `sqlite3` CLI가 설치되어 있지 않으면 다음 에러가 발생합니다:
```
exec: "sqlite3": executable file not found in $PATH
```

## ✅ 해결 방법

### **방법 1: 호스트에서 직접 작업 (추천 - 즉시 사용 가능)**

```bash
# 1. DB 파일을 호스트로 복사
docker cp caremeal-backend:/app/caremeal.db ./caremeal.db

# 2. 호스트에 sqlite3 설치 (Ubuntu)
sudo apt-get update && sudo apt-get install -y sqlite3

# 3. 백업
cp caremeal.db caremeal_backup_$(date +%Y%m%d).db

# 4. recipes 테이블 초기화
sqlite3 caremeal.db "DELETE FROM recipes;"

# 5. 새 데이터 Import
sqlite3 caremeal.db < recipes_export.sql

# 6. 검증
sqlite3 caremeal.db "SELECT COUNT(*) FROM recipes;"

# 7. 수정된 DB를 컨테이너로 복사
docker cp caremeal.db caremeal-backend:/app/caremeal.db

# 8. 컨테이너 재시작
docker restart caremeal-backend

# 9. 최종 확인
docker logs caremeal-backend --tail 20
```

---

### **방법 2: Python 스크립트 사용**

```bash
# 백업 스크립트 생성
cat > backup_db.py << 'EOF'
import sqlite3
from datetime import datetime

source = '/app/caremeal.db'
backup_name = f'/app/caremeal_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'

conn = sqlite3.connect(source)
backup = sqlite3.connect(backup_name)
conn.backup(backup)
backup.close()
conn.close()
print(f"✅ Backup created: {backup_name}")
EOF

# Import 스크립트 생성
cat > import_recipes.py << 'EOF'
import sqlite3
import sys

db_path = '/app/caremeal.db'
sql_file = sys.argv[1] if len(sys.argv) > 1 else '/app/recipes_export.sql'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

with open(sql_file, 'r', encoding='utf-8') as f:
    sql_script = f.read()

cursor.executescript(sql_script)
conn.commit()

# 검증
cursor.execute("SELECT COUNT(*) FROM recipes")
count = cursor.fetchone()[0]
conn.close()

print(f"✅ Successfully imported {count} recipes from {sql_file}")
EOF

# 컨테이너에 복사
docker cp backup_db.py caremeal-backend:/app/
docker cp import_recipes.py caremeal-backend:/app/
docker cp recipes_export.sql caremeal-backend:/app/

# 실행
docker exec caremeal-backend python /app/backup_db.py
docker exec caremeal-backend python /app/import_recipes.py /app/recipes_export.sql
```

---

### **방법 3: Dockerfile 수정 (장기적 해결책)**

`Dockerfile.backend`에 sqlite3 추가 (이미 수정됨):

```dockerfile
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*
```

재빌드 후 사용:
```bash
docker-compose build --no-cache caremeal-backend
docker-compose up -d
docker exec caremeal-backend sqlite3 /app/caremeal.db "SELECT COUNT(*) FROM recipes;"
```

---

## 🎯 권장 워크플로우

### **지금 당장 (긴급)**
→ **방법 1** 사용 (호스트에서 직접 작업)

### **다음 배포부터**
→ **방법 3** 적용 (Dockerfile 수정 후 재빌드)

---

## 📋 전체 실행 예시

```bash
# === 서버에서 실행 ===
cd ~/caremeal/careMeal-deploy

# 1. DB 파일 추출
docker cp caremeal-backend:/app/caremeal.db ./caremeal.db

# 2. sqlite3 설치 (최초 1회만)
sudo apt-get update && sudo apt-get install -y sqlite3

# 3. 백업
cp caremeal.db caremeal_backup_$(date +%Y%m%d).db

# 4. Import
sqlite3 caremeal.db "DELETE FROM recipes;"
sqlite3 caremeal.db < recipes_export.sql

# 5. 검증
sqlite3 caremeal.db "SELECT COUNT(*) FROM recipes;"
# 출력: 29 ✅

# 6. 컨테이너에 반영
docker cp caremeal.db caremeal-backend:/app/caremeal.db
docker restart caremeal-backend

# 7. 확인
sleep 5
docker logs caremeal-backend --tail 20
```

완료! 🎉
