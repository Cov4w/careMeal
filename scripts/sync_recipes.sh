#!/bin/bash

# 레시피 전체 동기화 스크립트
# 사용법: ./sync_recipes.sh

echo "📦 Exporting all recipes..."

# 전체 레시피 테이블 export
sqlite3 caremeal.db ".dump recipes" > recipes_full_sync.sql

echo "✅ All recipes exported to recipes_full_sync.sql"

# 레시피 개수 확인
RECIPE_COUNT=$(sqlite3 caremeal.db "SELECT COUNT(*) FROM recipes;")
echo "📊 Total recipes: $RECIPE_COUNT"

echo ""
echo "🚀 To apply on server (CAUTION: This will replace all recipes):"
echo "   1. Backup first: sqlite3 caremeal.db '.backup backup.db'"
echo "   2. Copy file: scp recipes_full_sync.sql user@server:/path/"
echo "   3. Run on server:"
echo "      sqlite3 caremeal.db 'DELETE FROM recipes;'"
echo "      sqlite3 caremeal.db < recipes_full_sync.sql"
