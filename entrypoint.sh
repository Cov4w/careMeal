#!/bin/bash

# caremeal.db 파일이 존재하는지 확인
if [ ! -f /app/caremeal.db ]; then
    echo "Creating empty caremeal.db..."
    touch /app/caremeal.db
fi

# 권한 설정 (누구나 읽고 쓸 수 있도록 chmod 666)
# 이는 호스트(EC2 ubuntu)와 컨테이너(root) 간의 권한 충돌을 방지합니다.
chmod 666 /app/caremeal.db

# 명령 전달 (CMD 실행)
exec "$@"
