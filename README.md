# CATSMARKET Web (Final v1.0)

냥코 대전쟁 아이템 · 웹 자판기 최종본

## 실행
```bash
npm install
npm start
```
Windows: `START.bat`

http://localhost:3000

## 포함 기능
- Discord OAuth 로그인
- 포인트 충전 (토스뱅크) + 티어 보너스 (1만 5% / 3만 7% / 5만 10%)
- 상품 구매 · 세이브코드 제출 · 지급
- VIP 1~3 (할인 + Discord 역할)
- 쿠폰 · 추천인 · 인기상품 · 찜 · 검색/정렬
- 후기 (본인/관리자 삭제) · 공지 · 문의
- 관리자 패널 (`/admin`)
- Discord 임베드 알림 + 버튼

## .env 주요 항목
Discord / 은행 / VIP / 보너스 / 채널 ID 등은 `.env` 참고

## Discord VIP
```
DISCORD_GUILD_ID=
DISCORD_VIP1_ROLE_ID=
DISCORD_VIP2_ROLE_ID=
DISCORD_VIP3_ROLE_ID=
```

**이 버전을 최종본으로 사용하세요.**


## Render 배포 (로컬 회원가입 버전)
- Build Command: `npm install`
- Start Command: `npm run start`
- Root Directory: 비워두기
- Discord OAuth 로그인은 사용하지 않습니다. 사이트에서 닉네임/비밀번호로 회원가입합니다.
- 관리자 계정은 Render 환경변수 `ADMIN_USERNAMES` (쉼표 구분)로 지정할 수 있습니다. 또는 로그인 후 사용자 UUID를 `ADMIN_USER_IDS`에 넣을 수 있습니다.
- `SESSION_SECRET`, `AUTH_SALT`, `BANK_NAME`, `BANK_ACCOUNT`, `BANK_HOLDER`, `WELCOME_BONUS` 등 기존 환경변수는 필요에 맞게 Render에 설정하세요.
- 배포 파일에는 `.env`와 `node_modules`를 포함하지 마세요.
