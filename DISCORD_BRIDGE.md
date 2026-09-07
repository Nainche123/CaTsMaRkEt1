# CATSMARKET Discord Bridge

Discord 봇에서 웹사이트 구매로그를 띄우려면 `POST /api/bridge/purchase` 호출.

Header: `X-CATSMARKET-SECRET: <CATSMARKET_WEB_SECRET>`

JSON:
```json
{
  "discordName": "냥코 유저",
  "productName": "초보자 스타트",
  "orderNo": "DISCORD-1234"
}
```

웹 주문은 관리자 패널의 주문관리에서 세이브코드 지급 후 고객에게 Discord DM과 웹 주문내역에 전달됩니다. 기존 Discord 주문을 웹 알림으로 반영할 때는 `/api/bridge/delivered` 를 사용합니다.
