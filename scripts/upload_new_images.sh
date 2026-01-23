#!/bin/bash

# 새 레시피 이미지 업로드 스크립트
# 사용법: ./upload_new_images.sh 31 35
# (ID 31부터 35까지 이미지 업로드)

START_ID=${1:-31}
END_ID=${2:-35}
SERVER_IP="100.31.199.102"
KEY_FILE="/Users/cov4/careMealBackup/caremeal.pem"
SERVER_PATH="~/caremeal/careMeal-deploy/static/"

echo "📤 Uploading recipe images from ID $START_ID to $END_ID..."

# 이미지 파일 목록 생성
FILES=""
for i in $(seq -f "%03g" $START_ID $END_ID); do
    if [ -f "static/$i.png" ]; then
        FILES="$FILES static/$i.png"
        echo "  ✓ Found: $i.png"
    else
        echo "  ✗ Missing: $i.png"
    fi
done

if [ -z "$FILES" ]; then
    echo "❌ No image files found!"
    exit 1
fi

# SCP로 전송
echo ""
echo "🚀 Uploading to server..."
scp -i "$KEY_FILE" $FILES ubuntu@$SERVER_IP:$SERVER_PATH

if [ $? -eq 0 ]; then
    echo "✅ Upload complete!"
    echo ""
    echo "📋 Next steps on server:"
    echo "   docker cp static caremeal-backend:/app/"
else
    echo "❌ Upload failed!"
    exit 1
fi
