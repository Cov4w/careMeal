#!/bin/bash

# 새 레시피 추가 스크립트
# 사용법: ./add_new_recipes.sh <시작_ID>

START_ID=${1:-31}  # 기본값: 31 (현재 29개이므로 다음은 30부터, 여유있게 31)

echo "📦 Exporting new recipes from ID $START_ID..."

# 특정 ID 이상의 레시피만 export
sqlite3 caremeal.db <<EOF > new_recipes.sql
.mode insert recipes
SELECT * FROM recipes WHERE id >= $START_ID;
EOF

echo "✅ New recipes exported to new_recipes.sql"
echo "📋 Preview:"
cat new_recipes.sql

echo ""
echo "🚀 To apply on server:"
echo "   1. Copy file: scp new_recipes.sql user@server:/path/"
echo "   2. Run on server: sqlite3 caremeal.db < new_recipes.sql"
