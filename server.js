import express from "express";
import session from "express-session";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (_) {}
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env before reading any process.env values
loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const DATA_FILE = path.join(__dirname, "data.json");
const ADMIN_IDS = String(process.env.ADMIN_USER_IDS || process.env.ADMIN_DISCORD_IDS || "").split(",").map(s=>s.trim()).filter(Boolean);
const ADMIN_USERNAMES = String(process.env.ADMIN_USERNAMES || "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
const AUTH_SALT = String(process.env.AUTH_SALT || "catsmarket-local-auth").trim();
const DEPOSIT_CHANNEL_ID = String(process.env.DEPOSIT_CHANNEL_ID || process.env.SECURITY_LOG_CHANNEL_ID || "1546116465592238181").trim();
const PURCHASE_CHANNEL_ID = String(process.env.PURCHASE_CHANNEL_ID || process.env.SECURITY_LOG_CHANNEL_ID || DEPOSIT_CHANNEL_ID).trim();
const WEB_SECRET = String(process.env.CATSMARKET_WEB_SECRET || "").trim();
const VIP_T1 = Math.max(1000, Math.floor(Number(process.env.VIP1_THRESHOLD || process.env.VIP_THRESHOLD || 10000)));
const VIP_T2 = Math.max(VIP_T1, Math.floor(Number(process.env.VIP2_THRESHOLD || 30000)));
const VIP_T3 = Math.max(VIP_T2, Math.floor(Number(process.env.VIP3_THRESHOLD || 70000)));
const VIP_DISC = {
  1: Math.max(0, Math.min(30, Number(process.env.VIP1_DISCOUNT || 3))),
  2: Math.max(0, Math.min(30, Number(process.env.VIP2_DISCOUNT || 6))),
  3: Math.max(0, Math.min(30, Number(process.env.VIP3_DISCOUNT || 10))),
};
// VIP 직접 구매 (포인트)
const VIP_BUY_PRICE = {
  1: Math.max(0, Math.floor(Number(process.env.VIP1_PRICE || 5000))),
  2: Math.max(0, Math.floor(Number(process.env.VIP2_PRICE || 12000))),
  3: Math.max(0, Math.floor(Number(process.env.VIP3_PRICE || 25000))),
};
// 월 보너스 1회 지급액
const VIP_MONTHLY_BONUS = {
  1: Math.max(0, Math.floor(Number(process.env.VIP1_MONTHLY_BONUS || 500))),
  2: Math.max(0, Math.floor(Number(process.env.VIP2_MONTHLY_BONUS || 800))),
  3: Math.max(0, Math.floor(Number(process.env.VIP3_MONTHLY_BONUS || 1200))),
};
const VIP_MONTHLY_LIMIT = { 1:1, 2:2, 3:3 };
const VIP_PERKS = {
  1: [
    "상품 3% 할인",
    "월 1회 VIP 보너스 지급",
    "이벤트 / 특가 상품 우선 구매",
    "VIP 전용 공지 확인"
  ],
  2: [
    "상품 6% 할인",
    "월 2회 VIP 보너스 지급",
    "이벤트 / 특가 상품 우선 구매",
    "신규 상품 우선 구매",
    "VIP 2 전용 보너스 상품 지급"
  ],
  3: [
    "상품 10% 할인",
    "월 3회 VIP 보너스 지급",
    "신규 상품 최우선 구매",
    "VIP 3 전용 보너스 상품 지급",
    "한정 상품 / 이벤트 우선 참여",
    "VIP 전용 역할 및 채널 이용"
  ]
};
const TOPUP_BONUS_MIN = Math.max(0, Math.floor(Number(process.env.TOPUP_BONUS_MIN || 10000)));
const TOPUP_BONUS_PERCENT = Math.max(0, Math.min(50, Number(process.env.TOPUP_BONUS_PERCENT || 5)));
const DISCORD_GUILD_ID = String(process.env.DISCORD_GUILD_ID || "").trim();
const DISCORD_VIP_ROLE_IDS = {
  1: String(process.env.DISCORD_VIP1_ROLE_ID || process.env.DISCORD_VIP_ROLE_ID || "").trim(),
  2: String(process.env.DISCORD_VIP2_ROLE_ID || "").trim(),
  3: String(process.env.DISCORD_VIP3_ROLE_ID || "").trim(),
};
const app = express();

const PRODUCTS=[
  {
    "id": "6767",
    "category": "package",
    "badge": "패키지",
    "name": "6767 패키지",
    "price": 2000,
    "description": "핵심 재화와 육성을 한 번에 구성한 인기 패키지.",
    "contents": [
      "🪙 통조림 676,767개",
      "✨ 경험치 676,767,676개",
      "🎟️ NP 676,767개",
      "👑 리더십 6,767개",
      "🐱 냥코 티켓 6,767장",
      "💎 레어 티켓 6,767장",
      "🔷 플래티넘 티켓 6,767장",
      "🌟 레전드 티켓 6,767장",
      "🐾 캣츠아이 6,767개",
      "🌿 개다래 & 수석 6,767개",
      "🔮 본능구슬 6,767개",
      "⚔️ 배틀 아이템 6,767개",
      "🥤 고양이 드링크 6,767개",
      "🎁 이벤트 & 럭키 티켓 6,767장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "peak",
    "category": "package",
    "badge": "패키지",
    "name": "PEAK 패키지",
    "price": 5300,
    "description": "대량 구성의 프리미엄 패키지.",
    "contents": [
      "🪙 통조림 1,500,000개",
      "🐱 냥코 티켓 15,000장",
      "💎 레어 티켓 15,000장",
      "🔷 플래티넘 티켓 15,000장",
      "🌟 레전드 티켓 15,000장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "555",
    "category": "package",
    "badge": "패키지",
    "name": "555 패키지",
    "price": 3500,
    "description": "재화와 티켓을 균형 있게 구성.",
    "contents": [
      "🪙 통조림 550,000개",
      "🐱 냥코 티켓 5,555장",
      "💎 레어 티켓 5,555장",
      "🔷 플래티넘 티켓 555장",
      "🌟 레전드 티켓 555장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "999",
    "category": "package",
    "badge": "패키지",
    "name": "999 패키지",
    "price": 4500,
    "description": "대량 재화와 티켓을 한 번에.",
    "contents": [
      "🪙 통조림 990,000개",
      "🐱 냥코 티켓 9,999장",
      "💎 레어 티켓 9,999장",
      "🔷 플래티넘 티켓 999장",
      "🌟 레전드 티켓 999장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "starter",
    "category": "package",
    "badge": "패키지",
    "name": "초보자 스타트",
    "price": 1990,
    "description": "입문 · 재화와 티켓을 한 번에.",
    "contents": [
      "🪙 통조림 300,000개",
      "🐱 냥코 티켓 3,000장",
      "💎 레어 티켓 300장",
      "🔷 플래티넘 티켓 10장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "battle",
    "category": "package",
    "badge": "패키지",
    "name": "전투 준비",
    "price": 1790,
    "description": "전투에 필요한 재화와 아이템을 한 번에.",
    "contents": [
      "👑 리더십 9,999개",
      "⚔️ 모든 배틀 아이템 9,999개",
      "🌿 개다래 & 수석 999개",
      "🥤 모든 고양이 드링크 9,999개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "ticket",
    "category": "package",
    "badge": "패키지",
    "name": "가성비 뽑기",
    "price": 2790,
    "description": "뽑기 집중 · 티켓 구성이 좋은 상품.",
    "contents": [
      "🐱 냥코 티켓 10,000장",
      "💎 레어 티켓 1,000장",
      "🔷 플래티넘 티켓 100장",
      "🌟 레전드 티켓 10장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "3rd",
    "category": "package",
    "badge": "패키지",
    "name": "올냥 3진 마스터",
    "price": 3290,
    "description": "캐릭터 육성 입문 · 올냥 3진용.",
    "contents": [
      "📚 모든 캐릭터 추가",
      "💪 모든 캐릭터 레벨 MAX",
      "✨ 모든 캐릭터 전체 진화"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "speed",
    "category": "package",
    "badge": "패키지",
    "name": "초고속 성장",
    "price": 3490,
    "description": "빠른 성장을 위한 패키지.",
    "contents": [
      "🪙 통조림 1,000,000개",
      "✨ 경험치 1,000,000,000개",
      "🎟️ NP 100,000개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "talent",
    "category": "package",
    "badge": "패키지",
    "name": "본능 마스터",
    "price": 3490,
    "description": "본능 강화 중심 패키지.",
    "contents": [
      "🎟️ NP 100,000개",
      "🔮 모든 본능구슬 9,999개",
      "🐾 모든 캣츠아이 9,999개"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "blue-eyes",
    "category": "package",
    "badge": "패키지",
    "name": "모든 블루아이즈",
    "price": 4500,
    "description": "모든 블루아이즈 구성 상품.",
    "contents": [
      "🔵 모든 블루아이즈"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "all-growth",
    "category": "package",
    "badge": "패키지",
    "name": "올냥 육성",
    "price": 4490,
    "description": "전체 캐릭터 육성 중심 패키지.",
    "contents": [
      "📚 모든 캐릭터 추가",
      "💪 모든 캐릭터 전체 풀강",
      "🪙 통조림 500,000개",
      "✨ 경험치 1,000,000,000개",
      "🎟️ NP 100,000개",
      "🐾 캣츠아이 9,999개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "all-in-one",
    "category": "package",
    "badge": "패키지",
    "name": "스펙업 올인원",
    "price": 5990,
    "description": "중급 스펙업 · 재화/티켓/육성을 묶은 상품.",
    "contents": [
      "🪙 통조림 1,000,000개",
      "✨ 경험치 1,000,000,000개",
      "🎟️ NP 100,000개",
      "🐱 냥코 티켓 5,000장",
      "💎 레어 티켓 500장",
      "🔷 플래티넘 티켓 20장",
      "🌟 레전드 티켓 10장",
      "🐾 캣츠아이 9,999개",
      "🔮 본능구슬 999개",
      "🥤 고양이 드링크 9,999개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "intro-all",
    "category": "package",
    "badge": "패키지",
    "name": "입문 올인원",
    "price": 2490,
    "description": "초반 계정 성장을 위한 종합 패키지.",
    "contents": [
      "🪙 통조림 500,000개",
      "✨ 경험치 500,000,000개",
      "🎟️ NP 30,000개",
      "🐱 냥코 티켓 3,000장",
      "💎 레어 티켓 300장",
      "🐾 캣츠아이 2,000개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "level-max",
    "category": "package",
    "badge": "패키지",
    "name": "올냥 레벨 MAX",
    "price": 3990,
    "description": "모든 캐릭터 레벨을 MAX로 구성.",
    "contents": [
      "📚 모든 캐릭터 추가",
      "💪 모든 캐릭터 레벨 MAX"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "talent-max",
    "category": "package",
    "badge": "패키지",
    "name": "올냥 본능 MAX",
    "price": 4990,
    "description": "모든 캐릭터 풀강 및 본능 MAX 구성.",
    "contents": [
      "📚 모든 캐릭터 추가",
      "💪 모든 캐릭터 전체 풀강",
      "🧬 전체 본능 MAX"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "complete-master",
    "category": "package",
    "badge": "패키지",
    "name": "올냥 완성 마스터",
    "price": 6490,
    "description": "모든 캐릭터 추가부터 풀강·진화·본능까지 구성.",
    "contents": [
      "📚 모든 캐릭터 추가",
      "💪 모든 캐릭터 전체 풀강",
      "✨ 모든 캐릭터 전체 진화",
      "🧬 전체 본능 MAX"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "encyclopedia",
    "category": "package",
    "badge": "패키지",
    "name": "도감 마스터",
    "price": 1490,
    "description": "모든 캐릭터 도감 해금 구성.",
    "contents": [
      "📚 모든 캐릭터 도감 해금"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "account-starter",
    "category": "package",
    "badge": "패키지",
    "name": "계정 스타터 MAX",
    "price": 2490,
    "description": "초반 재화와 육성을 한 번에 시작.",
    "contents": [
      "🪙 통조림 300,000개",
      "✨ 경험치 300,000,000개",
      "🎟️ NP 30,000개",
      "🐾 캣츠아이 2,000개",
      "👑 리더십 9,999개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "555-2",
    "category": "package",
    "badge": "패키지",
    "name": "555 2팩",
    "price": 6700,
    "description": "대량 구매용 555 구성.",
    "contents": [
      "🪙 통조림 1,100,000개",
      "🐱 냥코 티켓 11,110장",
      "💎 레어 티켓 11,110장",
      "🔷 플래티넘 티켓 1,110장",
      "🌟 레전드 티켓 1,110장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "999-2",
    "category": "package",
    "badge": "패키지",
    "name": "999 2팩",
    "price": 8700,
    "description": "대량 구매용 999 구성.",
    "contents": [
      "🪙 통조림 1,980,000개",
      "🐱 냥코 티켓 19,998장",
      "💎 레어 티켓 19,998장",
      "🔷 플래티넘 티켓 1,998장",
      "🌟 레전드 티켓 1,998장"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "cats-toward",
    "category": "package",
    "badge": "패키지",
    "name": "CATS을 향해",
    "price": 10000,
    "description": "최상위 대량 구성 · 계정 전체 스펙업.",
    "contents": [
      "🪙 통조림 2,000,000개",
      "✨ 경험치 2,000,000,000개",
      "🎟️ NP 200,000개",
      "🐱 냥코 티켓 10,000장",
      "💎 레어 티켓 10,000장",
      "🔷 플래티넘 티켓 1,000장",
      "🌟 레전드 티켓 500장",
      "🐾 모든 캣츠아이 9,999개",
      "🌿 모든 개다래 & 수석 9,999개",
      "🔮 모든 본능구슬 9,999개",
      "⚔️ 모든 배틀 아이템 9,999개",
      "🥤 모든 고양이 드링크 9,999개",
      "👑 리더십 9,999개",
      "📚 모든 캐릭터 추가",
      "💪 모든 캐릭터 전체 풀강",
      "✨ 모든 캐릭터 전체 진화",
      "🧬 모든 캐릭터 전체 본능"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "all-items",
    "category": "package",
    "badge": "패키지",
    "name": "올아이템 마스터",
    "price": 2990,
    "description": "육성 재화를 한 번에 정리하는 실속형.",
    "contents": [
      "👑 리더십 9,999개",
      "⚔️ 모든 배틀 아이템 9,999개",
      "🌿 모든 개다래 & 수석 9,999개",
      "🔮 모든 본능구슬 9,999개",
      "🐾 모든 캣츠아이 9,999개",
      "🥤 모든 고양이 드링크 9,999개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "ticket-collector",
    "category": "package",
    "badge": "패키지",
    "name": "티켓 컬렉터",
    "price": 2490,
    "description": "티켓류를 한 번에 구성.",
    "contents": [
      "🐱 냥코 티켓 5,000장",
      "💎 레어 티켓 500장",
      "🔷 플래티넘 티켓 30장",
      "🌟 레전드 티켓 15장",
      "🎁 이벤트 & 럭키 티켓 3,000장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "early-story",
    "category": "package",
    "badge": "패키지",
    "name": "초반 완성 패키지",
    "price": 1990,
    "description": "세계편 초반 진행과 기본 재화 구성.",
    "contents": [
      "🌍 세계편 1~3장",
      "🗝️ 세계편 보물 작업",
      "🪙 통조림 300,000개",
      "✨ 경험치 300,000,000개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "mid-growth",
    "category": "package",
    "badge": "패키지",
    "name": "중반 성장 패키지",
    "price": 2990,
    "description": "중반 성장용 재화 구성.",
    "contents": [
      "🔮 미래편 1~3장",
      "🗝️ 미래편 보물 작업",
      "🪙 통조림 500,000개",
      "✨ 경험치 500,000,000개",
      "🎟️ NP 30,000개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "late-growth",
    "category": "package",
    "badge": "패키지",
    "name": "후반 성장 패키지",
    "price": 3990,
    "description": "후반 성장용 대량 재화 구성.",
    "contents": [
      "🌌 우주편 1~3장",
      "🗝️ 우주편 보물 작업",
      "🪙 통조림 700,000개",
      "✨ 경험치 1,000,000,000개",
      "🎟️ NP 50,000개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "story-master",
    "category": "package",
    "badge": "패키지",
    "name": "스토리 정복 마스터",
    "price": 4490,
    "description": "세계·미래·우주를 한 번에 완성하는 스토리형 상품.",
    "contents": [
      "🌍 세계편 1~3장",
      "🔮 미래편 1~3장",
      "🌌 우주편 1~3장",
      "🗝️ 세계/미래/우주 보물 최고급"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "zombie-master",
    "category": "package",
    "badge": "패키지",
    "name": "좀비 올클 마스터",
    "price": 2290,
    "description": "세계·미래·우주 좀비를 한 번에 정리.",
    "contents": [
      "🧟 세계편 좀비 올클",
      "🧟 미래편 좀비 올클",
      "🧟 우주편 좀비 올클"
    ],
    "image": "",
    "icon": "🧟"
  },
  {
    "id": "treasure-master",
    "category": "package",
    "badge": "패키지",
    "name": "올보물 마스터",
    "price": 1990,
    "description": "세 편의 보물을 빠르게 완성.",
    "contents": [
      "🗝️ 세계편 보물 최고급",
      "🗝️ 미래편 보물 최고급",
      "🗝️ 우주편 보물 최고급"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "battle-spec",
    "category": "package",
    "badge": "패키지",
    "name": "전투 스펙 마스터",
    "price": 2490,
    "description": "전투용 아이템과 육성 재화를 구성.",
    "contents": [
      "👑 리더십 9,999개",
      "⚔️ 모든 배틀 아이템 9,999개",
      "🥤 모든 고양이 드링크 9,999개",
      "🐾 캣츠아이 3,000개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "beginner-max",
    "category": "package",
    "badge": "패키지",
    "name": "초보 탈출 MAX",
    "price": 2990,
    "description": "세계편 진행과 초반 스펙업을 한 번에.",
    "contents": [
      "🌍 세계편 1~3장",
      "🗝️ 세계편 보물 최고급",
      "🪙 통조림 500,000개",
      "✨ 경험치 500,000,000개",
      "🎟️ NP 30,000개",
      "🐱 냥코 티켓 3,000장",
      "💎 레어 티켓 300장",
      "🐾 캣츠아이 2,000개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "world1",
    "category": "story",
    "badge": "스토리",
    "name": "🌍 세계편 1장",
    "price": 500,
    "description": "세계편 1장 진행 상품.",
    "contents": [
      "세계편 1장"
    ],
    "image": "",
    "icon": "🌍"
  },
  {
    "id": "world2",
    "category": "story",
    "badge": "스토리",
    "name": "🌍 세계편 2장",
    "price": 600,
    "description": "세계편 2장 진행 상품.",
    "contents": [
      "세계편 2장"
    ],
    "image": "",
    "icon": "🌍"
  },
  {
    "id": "world3",
    "category": "story",
    "badge": "스토리",
    "name": "🌍 세계편 3장",
    "price": 700,
    "description": "세계편 3장 진행 상품.",
    "contents": [
      "세계편 3장"
    ],
    "image": "",
    "icon": "🌍"
  },
  {
    "id": "future1",
    "category": "story",
    "badge": "스토리",
    "name": "🔮 미래편 1장",
    "price": 700,
    "description": "미래편 1장 진행 상품.",
    "contents": [
      "미래편 1장"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "future2",
    "category": "story",
    "badge": "스토리",
    "name": "🔮 미래편 2장",
    "price": 800,
    "description": "미래편 2장 진행 상품.",
    "contents": [
      "미래편 2장"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "future3",
    "category": "story",
    "badge": "스토리",
    "name": "🔮 미래편 3장",
    "price": 900,
    "description": "미래편 3장 진행 상품.",
    "contents": [
      "미래편 3장"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "space1",
    "category": "story",
    "badge": "스토리",
    "name": "🌌 우주편 1장",
    "price": 900,
    "description": "우주편 1장 진행 상품.",
    "contents": [
      "우주편 1장"
    ],
    "image": "",
    "icon": "🌌"
  },
  {
    "id": "space2",
    "category": "story",
    "badge": "스토리",
    "name": "🌌 우주편 2장",
    "price": 1000,
    "description": "우주편 2장 진행 상품.",
    "contents": [
      "우주편 2장"
    ],
    "image": "",
    "icon": "🌌"
  },
  {
    "id": "space3",
    "category": "story",
    "badge": "스토리",
    "name": "🌌 우주편 3장",
    "price": 1100,
    "description": "우주편 3장 진행 상품.",
    "contents": [
      "우주편 3장"
    ],
    "image": "",
    "icon": "🌌"
  },
  {
    "id": "cf50",
    "category": "resource",
    "badge": "재화 단품",
    "name": "통조림 5만개",
    "price": 200,
    "description": "통조림 50,000개 단품.",
    "contents": [
      "통조림 50,000개"
    ],
    "image": "",
    "icon": "🥫"
  },
  {
    "id": "cf200",
    "category": "resource",
    "badge": "재화 단품",
    "name": "통조림 20만개",
    "price": 650,
    "description": "통조림 200,000개 단품.",
    "contents": [
      "통조림 200,000개"
    ],
    "image": "",
    "icon": "🥫"
  },
  {
    "id": "cf500",
    "category": "resource",
    "badge": "재화 단품",
    "name": "통조림 50만개",
    "price": 1000,
    "description": "통조림 500,000개 단품.",
    "contents": [
      "통조림 500,000개"
    ],
    "image": "",
    "icon": "🥫"
  },
  {
    "id": "cf1000",
    "category": "resource",
    "badge": "재화 단품",
    "name": "통조림 100만개",
    "price": 2000,
    "description": "통조림 1,000,000개 단품.",
    "contents": [
      "통조림 1,000,000개"
    ],
    "image": "",
    "icon": "🥫"
  },
  {
    "id": "xp100",
    "category": "resource",
    "badge": "재화 단품",
    "name": "경험치 1억개",
    "price": 500,
    "description": "경험치 100,000,000 단품.",
    "contents": [
      "경험치 100,000,000"
    ],
    "image": "",
    "icon": "✨"
  },
  {
    "id": "xp1000",
    "category": "resource",
    "badge": "재화 단품",
    "name": "경험치 10억개",
    "price": 1500,
    "description": "경험치 1,000,000,000 단품.",
    "contents": [
      "경험치 1,000,000,000"
    ],
    "image": "",
    "icon": "✨"
  },
  {
    "id": "np10",
    "category": "resource",
    "badge": "재화 단품",
    "name": "NP 1만개",
    "price": 500,
    "description": "NP 10,000개 단품.",
    "contents": [
      "NP 10,000개"
    ],
    "image": "",
    "icon": "🎟️"
  },
  {
    "id": "np100",
    "category": "resource",
    "badge": "재화 단품",
    "name": "NP 10만개",
    "price": 1500,
    "description": "NP 100,000개 단품.",
    "contents": [
      "NP 100,000개"
    ],
    "image": "",
    "icon": "🎟️"
  },
  {
    "id": "lead",
    "category": "resource",
    "badge": "재화 단품",
    "name": "리더십 9,999개",
    "price": 700,
    "description": "리더십 9,999개 단품.",
    "contents": [
      "리더십 9,999개"
    ],
    "image": "",
    "icon": "👑"
  },
  {
    "id": "catseye",
    "category": "resource",
    "badge": "재화 단품",
    "name": "모든 캣츠아이 9,999개",
    "price": 750,
    "description": "모든 캣츠아이 9,999개.",
    "contents": [
      "모든 캣츠아이 9,999개"
    ],
    "image": "",
    "icon": "🐾"
  },
  {
    "id": "fruit",
    "category": "resource",
    "badge": "재화 단품",
    "name": "모든 개다래 & 수석 999개",
    "price": 750,
    "description": "모든 개다래 & 수석 999개.",
    "contents": [
      "모든 개다래 & 수석 999개"
    ],
    "image": "",
    "icon": "🌿"
  },
  {
    "id": "orb",
    "category": "resource",
    "badge": "재화 단품",
    "name": "모든 본능구슬 999개",
    "price": 1000,
    "description": "모든 본능구슬 999개.",
    "contents": [
      "모든 본능구슬 999개"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "battle-item",
    "category": "resource",
    "badge": "재화 단품",
    "name": "모든 배틀 아이템 9,999개",
    "price": 650,
    "description": "모든 배틀 아이템 9,999개.",
    "contents": [
      "모든 배틀 아이템 9,999개"
    ],
    "image": "",
    "icon": "⚔️"
  },
  {
    "id": "battle-one",
    "category": "resource",
    "badge": "재화 단품",
    "name": "배틀 아이템 단품",
    "price": 250,
    "description": "원하는 배틀 아이템 1종 단품.",
    "contents": [
      "원하는 배틀 아이템 단품"
    ],
    "image": "",
    "icon": "⚔️"
  },
  {
    "id": "drink",
    "category": "resource",
    "badge": "재화 단품",
    "name": "모든 고양이 드링크 9,999개",
    "price": 500,
    "description": "모든 고양이 드링크 9,999개.",
    "contents": [
      "모든 고양이 드링크 9,999개"
    ],
    "image": "",
    "icon": "🥤"
  },
  {
    "id": "leadmax",
    "category": "resource",
    "badge": "재화 단품",
    "name": "통솔력 MAX",
    "price": 500,
    "description": "통솔력 MAX 상품.",
    "contents": [
      "통솔력 9,999개"
    ],
    "image": "",
    "icon": "🎁"
  },
  {
    "id": "cmax",
    "category": "resource",
    "badge": "재화 단품",
    "name": "캣츠아이 MAX",
    "price": 600,
    "description": "캣츠아이 MAX 상품.",
    "contents": [
      "캣츠아이 9,999개"
    ],
    "image": "",
    "icon": "🐾"
  },
  {
    "id": "dmax",
    "category": "resource",
    "badge": "재화 단품",
    "name": "고양이 드링크 MAX",
    "price": 600,
    "description": "고양이 드링크 MAX 상품.",
    "contents": [
      "고양이 드링크 9,999개"
    ],
    "image": "",
    "icon": "🥤"
  },
  {
    "id": "fmax",
    "category": "resource",
    "badge": "재화 단품",
    "name": "개다래열매 MAX",
    "price": 600,
    "description": "개다래열매 MAX 상품.",
    "contents": [
      "개다래열매 9,999개"
    ],
    "image": "",
    "icon": "🌿"
  },
  {
    "id": "omax",
    "category": "resource",
    "badge": "재화 단품",
    "name": "본능구슬 MAX",
    "price": 600,
    "description": "본능구슬 MAX 상품.",
    "contents": [
      "본능구슬 9,999개"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "luckymax",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "럭키 티켓 MAX",
    "price": 600,
    "description": "럭키 티켓 MAX 상품.",
    "contents": [
      "럭키 티켓 9,999장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "normal",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "냥코 티켓 3,000장",
    "price": 500,
    "description": "냥코 티켓 3,000장.",
    "contents": [
      "냥코 티켓 3,000장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "rare",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "레어 티켓 300장",
    "price": 500,
    "description": "레어 티켓 300장.",
    "contents": [
      "레어 티켓 300장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "plat10",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "플래티넘 티켓 10장",
    "price": 500,
    "description": "플래티넘 티켓 10장.",
    "contents": [
      "플래티넘 티켓 10장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "plat100",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "플래티넘 티켓 100장",
    "price": 2000,
    "description": "플래티넘 티켓 100장.",
    "contents": [
      "플래티넘 티켓 100장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "plat500",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "플래티넘 티켓 500장",
    "price": 2460,
    "description": "플래티넘 티켓 500장.",
    "contents": [
      "플래티넘 티켓 500장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "legend5",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "레전드 티켓 5장",
    "price": 500,
    "description": "레전드 티켓 5장.",
    "contents": [
      "레전드 티켓 5장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "legend100",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "레전드 티켓 100장",
    "price": 1500,
    "description": "레전드 티켓 100장.",
    "contents": [
      "레전드 티켓 100장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "legend500",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "레전드 티켓 500장",
    "price": 2700,
    "description": "레전드 티켓 500장.",
    "contents": [
      "레전드 티켓 500장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "event",
    "category": "ticket",
    "badge": "티켓 단품",
    "name": "이벤트 & 럭키 티켓 2,500장",
    "price": 500,
    "description": "이벤트 & 럭키 티켓 2,500장.",
    "contents": [
      "이벤트 & 럭키 티켓 2,500장"
    ],
    "image": "",
    "icon": "🎫"
  },
  {
    "id": "allchar",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "모든 캐릭터 추가",
    "price": 2000,
    "description": "모든 캐릭터 추가 상품.",
    "contents": [
      "모든 캐릭터 추가"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "allmax",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "모든 캐릭터 전체 풀강",
    "price": 2200,
    "description": "모든 캐릭터 전체 풀강 상품.",
    "contents": [
      "모든 캐릭터 전체 풀강"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "alltrue",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "모든 캐릭터 전체 진화",
    "price": 2800,
    "description": "모든 캐릭터 전체 진화 상품.",
    "contents": [
      "모든 캐릭터 전체 진화"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "alltalent",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "모든 캐릭터 전체 본능",
    "price": 3000,
    "description": "모든 캐릭터 전체 본능 상품.",
    "contents": [
      "모든 캐릭터 전체 본능"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "charone",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 단품",
    "price": 500,
    "description": "원하는 캐릭터 1종 단품.",
    "contents": [
      "원하는 캐릭터 선택"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "charlevel",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 레벨업",
    "price": 500,
    "description": "원하는 캐릭터 레벨업.",
    "contents": [
      "원하는 캐릭터 선택",
      "레벨업"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "chartrue",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 진화",
    "price": 500,
    "description": "원하는 캐릭터 진화.",
    "contents": [
      "원하는 캐릭터 선택",
      "진화"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "chartalent",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 본능",
    "price": 500,
    "description": "원하는 캐릭터 본능.",
    "contents": [
      "원하는 캐릭터 선택",
      "본능"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "charmax",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 레벨 MAX",
    "price": 700,
    "description": "원하는 캐릭터 레벨 MAX.",
    "contents": [
      "원하는 캐릭터 선택",
      "레벨 MAX"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "chartmax",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 본능 MAX",
    "price": 800,
    "description": "원하는 캐릭터 본능 MAX.",
    "contents": [
      "원하는 캐릭터 선택",
      "본능 MAX"
    ],
    "image": "",
    "icon": "🔮"
  },
  {
    "id": "chardex",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 도감 해금",
    "price": 500,
    "description": "원하는 캐릭터 도감 해금.",
    "contents": [
      "원하는 캐릭터 선택",
      "도감 해금"
    ],
    "image": "",
    "icon": "🐱"
  },
  {
    "id": "chardelete",
    "category": "character",
    "badge": "캐릭터 단품",
    "name": "원하는 캐릭터 삭제",
    "price": 500,
    "description": "원하는 캐릭터 삭제 서비스.",
    "contents": [
      "원하는 캐릭터 선택",
      "삭제"
    ],
    "image": "",
    "icon": "🐱"
  }
];
function freshData(){return {users:[],orders:[],reviews:[],notices:[],tickets:[],messages:[],coupons:[],topups:[],activities:[],point_logs:[]}}
function loadData(){try{if(!fs.existsSync(DATA_FILE)){const d=freshData();fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2));return d}const p=JSON.parse(fs.readFileSync(DATA_FILE,"utf8"));return Object.assign(freshData(),p)}catch(e){console.error("data.json read error:",e);return freshData()}}
let data=loadData();
function saveData(){const tmp=DATA_FILE+".tmp";fs.writeFileSync(tmp,JSON.stringify(data,null,2),"utf8");fs.renameSync(tmp,DATA_FILE)}
function now(){return new Date().toISOString()}
function currentUser(req){return req.session.user||null}
function admin(req){const u=currentUser(req); if(!u) return false; return ADMIN_IDS.includes(String(u.id)) || ADMIN_USERNAMES.includes(String(u.username||"").toLowerCase()) || ADMIN_IDS.includes(String(u.discord_id||""));}
function findUser(discordId){return data.users.find(u=>String(u.discord_id)===String(discordId) || String(u.id)===String(discordId))}
function passwordHash(password){return crypto.createHash("sha256").update(`${AUTH_SALT}:${String(password||"")}`).digest("hex")}
function safeUsername(value){return String(value||"").trim().replace(/\s+/g," ").slice(0,32)}

function calcTopupBonus(amount){
  const a=Math.floor(Number(amount||0));
  // 티어: 1만 5%, 3만 7%, 5만 10%
  let pct = 0;
  if(a >= 50000) pct = Math.max(TOPUP_BONUS_PERCENT, 10);
  else if(a >= 30000) pct = Math.max(TOPUP_BONUS_PERCENT, 7);
  else if(a >= TOPUP_BONUS_MIN) pct = TOPUP_BONUS_PERCENT || 5;
  if(pct <= 0) return 0;
  return Math.floor(a * pct / 100);
}
function topupBonusPercentFor(amount){
  const a=Math.floor(Number(amount||0));
  if(a >= 50000) return Math.max(TOPUP_BONUS_PERCENT, 10);
  if(a >= 30000) return Math.max(TOPUP_BONUS_PERCENT, 7);
  if(a >= TOPUP_BONUS_MIN) return TOPUP_BONUS_PERCENT || 5;
  return 0;
}
function vipLevelFromSpend(spendTotal){
  const score=Number(spendTotal||0);
  if(score >= VIP_T3) return 3;
  if(score >= VIP_T2) return 2;
  if(score >= VIP_T1) return 1;
  return 0;
}
function monthKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
function userSpendStats(discordId){
  const id=String(discordId);
  const user=findUser(id);
  const topupTotal=(data.topups||[]).filter(t=>String(t.discord_id)===id && t.status==="confirmed")
    .reduce((s,t)=>s+Number(t.amount||0),0);
  // VIP 구매(membership)는 누적 구매에서 제외
  const spendTotal=(data.orders||[]).filter(o=>String(o.discord_id)===id && o.status!=="cancelled" && o.product_id!=="vip1" && o.product_id!=="vip2" && o.product_id!=="vip3")
    .reduce((s,o)=>s+Number(o.amount||0),0);
  const autoLevel=vipLevelFromSpend(spendTotal);
  const bought=Number(user?.vip_purchased||0);
  const level=Math.max(autoLevel, bought);
  return {
    topupTotal, spendTotal, autoLevel, purchased:bought, level,
    isVip: level>=1, discount: VIP_DISC[level]||0,
    nextNeed: level>=3?null:(level===2?VIP_T3:level===1?VIP_T2:VIP_T1),
    perks: VIP_PERKS[level]||[]
  };
}
async function assignDiscordVipRole(discordId, level){
  const token=String(process.env.DISCORD_BOT_TOKEN||"");
  if(!token || !DISCORD_GUILD_ID || !discordId || !level) return false;
  const roleId=DISCORD_VIP_ROLE_IDS[level];
  if(!roleId) return false;
  try{
    // 상위 등급 역할 부여 (하위 역할은 유지해도 되고, 있으면 함께 부여)
    for(let lv=1; lv<=level; lv++){
      const rid=DISCORD_VIP_ROLE_IDS[lv];
      if(!rid) continue;
      await fetch(`https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${encodeURIComponent(discordId)}/roles/${rid}`,{
        method:"PUT",
        headers:{Authorization:`Bot ${token}`, "Content-Type":"application/json", "X-Audit-Log-Reason":`CATSMARKET VIP${lv}`}
      });
    }
    return true;
  }catch{return false}
}
async function refreshUserVip(user, {notify=false}={}){
  if(!user) return 0;
  const st=userSpendStats(user.discord_id);
  user.total_topup=st.topupTotal;
  user.total_spent=st.spendTotal;
  const was=Number(user.vip_level||0);
  user.vip_level=st.level;
  user.is_vip=st.level>=1;
  if(st.level > was){
    user.vip_at=now();
    await assignDiscordVipRole(user.discord_id, st.level);
    if(notify){
      const disc=VIP_DISC[st.level]||0;
      await discordSendDM(user.discord_id,{
        content:`👑 **VIP ${st.level} 달성!**`,
        embeds:[brandEmbed({
          title:`VIP ${st.level} 등급이 되었습니다`,
          description:`누적 구매 기준으로 등급이 적용됩니다.\n할인 **${disc}%** · Discord VIP${st.level} 역할 연동`,
          color: st.level===3?0xA855F7:st.level===2?0x3B82F6:0xF59E0B,
          fields:[
            {name:"누적 구매", value:`${st.spendTotal.toLocaleString("ko-KR")}원`, inline:true},
            {name:"적용 할인", value:`${disc}%`, inline:true},
            {name:"월 보너스", value:`월 ${VIP_MONTHLY_LIMIT[st.level]}회`, inline:true}
          ]
        })],
        components:[{type:1,components:[{type:2,style:5,label:"VIP 혜택 보기",url:`${BASE_URL}/#vip`}]}]
      });
    }
  }
  return user.vip_level;
}

function addPointLog(discordId, amount, reason, meta={}){
  if(!Array.isArray(data.point_logs)) data.point_logs=[];
  data.point_logs.unshift({id:crypto.randomUUID(),discord_id:String(discordId),amount:Number(amount||0),reason:String(reason||""),meta,created_at:now()});
  data.point_logs=data.point_logs.slice(0,500);
}
function upsertUser(me){
  let u=findUser(me.id);
  const stamp=now();
  const welcome=Math.max(0, Math.floor(Number(process.env.WELCOME_BONUS||0)));
  if(!u){
    u={id:crypto.randomUUID(),discord_id:String(me.id),username:me.global_name||me.username||"Discord User",avatar:me.avatar||"",balance:welcome,created_at:stamp,last_login_at:stamp,welcome_bonus:welcome>0,referral_code:crypto.randomBytes(3).toString("hex").toUpperCase(),referred_by:""};
    data.users.push(u);
    if(welcome>0) addPointLog(u.discord_id, welcome, "신규 가입 보너스");
  }else{
    u.username=me.global_name||me.username||u.username;
    u.avatar=me.avatar||"";
    u.last_login_at=stamp;
    u.balance=Number(u.balance||0);
  }
  saveData();
  return u;
}
function discordPayload(input){
  if(input==null)return {};
  if(typeof input==="string")return {content:input};
  return input;
}
async function discordSendChannel(channelId,input){
  if(!process.env.DISCORD_BOT_TOKEN) return false;
  const token=String(process.env.DISCORD_BOT_TOKEN||"");
  if(!token||!channelId)return false;
  try{
    const body=discordPayload(input);
    const r=await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,{
      method:"POST",
      headers:{Authorization:`Bot ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    return r.ok;
  }catch{return false}
}
async function discordSendDM(userId,input){
  if(!process.env.DISCORD_BOT_TOKEN) return false;
  const token=String(process.env.DISCORD_BOT_TOKEN||"");
  if(!token||!userId)return false;
  try{
    const c=await fetch("https://discord.com/api/v10/users/@me/channels",{
      method:"POST",
      headers:{Authorization:`Bot ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({recipient_id:String(userId)})
    });
    if(!c.ok)return false;
    const dm=await c.json();
    const body=discordPayload(input);
    const m=await fetch(`https://discord.com/api/v10/channels/${dm.id}/messages`,{
      method:"POST",
      headers:{Authorization:`Bot ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify(body)
    });
    return m.ok;
  }catch{return false}
}
function brandEmbed(e={}){
  return {
    ...e,
    color: e.color ?? 0x3B82F6,
    author: e.author || {name:"CATSMARKET · 냥코 샵"},
    footer: e.footer || {text:"CATSMARKET"},
    timestamp: e.timestamp || new Date().toISOString()
  };
}
function reviewComponents(){
  return [{
    type:1,
    components:[
      {type:2,style:5,label:"⭐ 후기 남기기",url:`${BASE_URL}/#reviews`},
      {type:2,style:5,label:"📦 주문 내역",url:`${BASE_URL}/#orders`}
    ]
  }];
}
function addActivity(source,user,product,orderNo){const item={id:crypto.randomUUID(),source:source==="discord"?"discord":"web",username:user||"냥코 유저 한분",product_name:product||"상품",order_no:orderNo||"",created_at:now()};data.activities.unshift(item);data.activities=data.activities.slice(0,100);saveData();return item}
app.set("trust proxy",true);
app.use(express.json({limit:"200kb"}));
app.use(express.urlencoded({extended:false}));
app.use(session({secret:process.env.SESSION_SECRET||"catmarket-dev",resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*24*7}}));
app.use(express.static(path.join(__dirname,"public")));
app.get("/",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.get("/api/config",(req,res)=>{
  const u=currentUser(req);
  const dayAgo=Date.now()-24*60*60*1000;
  const todayBuys=data.activities.filter(a=>new Date(a.created_at).getTime()>=dayAgo).length;
  const reviewCount=data.reviews.length;
  const avgRating=reviewCount? (data.reviews.reduce((s,r)=>s+Number(r.rating||0),0)/reviewCount) : 5;
  res.json({
    loggedIn:!!u,
    user:u,
    isAdmin:admin(req),
    paymentMode:"points",
    bank:{name:process.env.BANK_NAME||"토스뱅크",account:process.env.BANK_ACCOUNT||"1908-8064-8818",holder:process.env.BANK_HOLDER||"문성식"},
    social:{todayBuys, reviewCount, avgRating:Math.round(avgRating*10)/10, totalOrders:data.orders.length},
    communityUrl:process.env.DISCORD_INVITE_URL||"",
    etaText:process.env.ETA_TEXT||"평균 10분~1시간 (수업·심야 시간대는 지연될 수 있음)",
    welcomeBonus:Math.max(0, Math.floor(Number(process.env.WELCOME_BONUS||0))),
    vipThresholds:{1:VIP_T1,2:VIP_T2,3:VIP_T3}, vipDiscounts:VIP_DISC, vipPrices:VIP_BUY_PRICE, vipPerks:VIP_PERKS,
    topupBonus:{min:TOPUP_BONUS_MIN, percent:TOPUP_BONUS_PERCENT, tiers:[
      {min:TOPUP_BONUS_MIN, percent:TOPUP_BONUS_PERCENT||5},
      {min:30000, percent:Math.max(TOPUP_BONUS_PERCENT,7)},
      {min:50000, percent:Math.max(TOPUP_BONUS_PERCENT,10)}
    ]},
    hoursNote:process.env.HOURS_NOTE||"평소 10분~1시간 · 수업/심야 시간에는 처리가 늦어질 수 있습니다",
    vip: u ? (()=>{ const st=userSpendStats(u.discord_id); return {isVip:st.isVip, level:st.level, topupTotal:st.topupTotal, spendTotal:st.spendTotal, discount:st.discount, nextNeed:st.nextNeed, thresholds:{1:VIP_T1,2:VIP_T2,3:VIP_T3}}; })() : null
  });
});
app.get("/api/wallet/logs",(req,res)=>{
  const u=currentUser(req);
  if(!u)return res.status(401).json({error:"로그인이 필요합니다."});
  const logs=(data.point_logs||[]).filter(l=>String(l.discord_id)===String(u.discord_id)).slice(0,50);
  res.json(logs);
});
app.post("/api/coupons/validate",(req,res)=>{
  const code=String(req.body.code||"").trim().toUpperCase();
  if(!code)return res.status(400).json({error:"쿠폰 코드를 입력해주세요."});
  const c=(data.coupons||[]).find(x=>String(x.code).toUpperCase()===code && x.active!==false);
  if(!c)return res.status(404).json({error:"유효하지 않은 쿠폰입니다."});
  if(c.expires_at && new Date(c.expires_at).getTime()<Date.now())return res.status(400).json({error:"만료된 쿠폰입니다."});
  if(c.max_uses!=null && Number(c.used||0)>=Number(c.max_uses))return res.status(400).json({error:"쿠폰 사용 한도가 끝났습니다."});
  res.json({ok:true, code:c.code, type:c.type||"percent", value:Number(c.value||0), min_amount:Number(c.min_amount||0)});
});
app.get("/api/admin/coupons",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});res.json(data.coupons||[])});
app.post("/api/admin/coupons",(req,res)=>{
  if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});
  const code=String(req.body.code||"").trim().toUpperCase().slice(0,20);
  const type=String(req.body.type||"percent");
  const value=Number(req.body.value||0);
  if(!code||!value)return res.status(400).json({error:"코드와 할인값을 입력해주세요."});
  if((data.coupons||[]).some(c=>c.code===code))return res.status(400).json({error:"이미 있는 코드입니다."});
  const c={id:crypto.randomUUID(),code,type:type==="fixed"?"fixed":"percent",value,min_amount:Number(req.body.min_amount||0),max_uses:req.body.max_uses==null?null:Number(req.body.max_uses),used:0,active:true,created_at:now()};
  data.coupons=data.coupons||[]; data.coupons.unshift(c); saveData(); res.json({ok:true,coupon:c});
});
app.patch("/api/admin/coupons/:id",(req,res)=>{
  if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});
  const c=(data.coupons||[]).find(x=>x.id===req.params.id);
  if(!c)return res.status(404).json({error:"쿠폰을 찾을 수 없습니다."});
  if(req.body.active!=null) c.active=!!req.body.active;
  saveData(); res.json({ok:true,coupon:c});
});
app.get("/api/products",(req,res)=>res.json(PRODUCTS));
app.get("/api/products/popular",(req,res)=>{
  const counts={};
  for(const o of (data.orders||[])){
    if(o.status==="cancelled") continue;
    counts[o.product_id]=(counts[o.product_id]||0)+1;
  }
  const ranked=[...PRODUCTS].map(p=>({...p, sold:counts[p.id]||0})).sort((a,b)=>b.sold-a.sold||a.price-b.price);
  res.json(ranked.slice(0,8));
});
app.get("/api/activity",(req,res)=>res.json(data.activities.slice(0,20)));
app.post("/api/auth/register",(req,res)=>{
  const username=safeUsername(req.body.username);
  const password=String(req.body.password||"");
  if(!/^[A-Za-z0-9가-힣_ .-]{2,32}$/.test(username)) return res.status(400).json({error:"닉네임은 2~32자로 입력해주세요."});
  if(password.length<6 || password.length>100) return res.status(400).json({error:"비밀번호는 6~100자로 입력해주세요."});
  if(data.users.some(x=>String(x.username||"").toLowerCase()===username.toLowerCase())) return res.status(409).json({error:"이미 사용 중인 닉네임입니다."});
  const stamp=now();
  const id=crypto.randomUUID();
  const welcome=Math.max(0,Math.floor(Number(process.env.WELCOME_BONUS||0)));
  const u={id,discord_id:`local_${id}`,username,avatar:"",password_hash:passwordHash(password),balance:welcome,created_at:stamp,last_login_at:stamp,welcome_bonus:welcome>0,referral_code:crypto.randomBytes(3).toString("hex").toUpperCase(),referred_by:"",is_vip:false,vip_level:0};
  data.users.push(u);
  if(welcome>0) addPointLog(u.discord_id,welcome,"신규 가입 보너스");
  data.login_logs=data.login_logs||[]; data.login_logs.unshift({id:crypto.randomUUID(),discord_id:u.discord_id,username:u.username,ip:req.ip,user_agent:req.get("user-agent")||"",created_at:stamp});
  saveData();
  req.session.user={id:u.id,discord_id:u.discord_id,username:u.username,avatar:""};
  res.json({ok:true,user:req.session.user});
});
app.post("/api/auth/login",(req,res)=>{
  const username=safeUsername(req.body.username); const password=String(req.body.password||"");
  const u=data.users.find(x=>String(x.username||"").toLowerCase()===username.toLowerCase());
  if(!u) return res.status(401).json({error:"닉네임 또는 비밀번호가 올바르지 않습니다."});
  if(!u.password_hash){return res.status(401).json({error:"기존 계정은 새 사이트 회원가입이 필요합니다."});}
  if(passwordHash(password)!==String(u.password_hash)) return res.status(401).json({error:"닉네임 또는 비밀번호가 올바르지 않습니다."});
  u.last_login_at=now();
  data.login_logs=data.login_logs||[]; data.login_logs.unshift({id:crypto.randomUUID(),discord_id:u.discord_id,username:u.username,ip:req.ip,user_agent:req.get("user-agent")||"",created_at:now()});
  saveData();
  req.session.user={id:u.id,discord_id:u.discord_id,username:u.username,avatar:u.avatar||""};
  res.json({ok:true,user:req.session.user});
});
app.get("/auth/discord",(req,res)=>res.status(410).send("Discord 로그인은 사용하지 않습니다. 사이트 회원가입/로그인을 이용해주세요."));
app.get("/auth/discord/callback",(req,res)=>res.redirect("/"));

app.post("/api/referral/bind",(req,res)=>{
  const u=currentUser(req);
  if(!u)return res.status(401).json({error:"로그인이 필요합니다."});
  const code=String(req.body.code||"").trim().toUpperCase();
  const user=findUser(u.discord_id);
  if(!user)return res.status(404).json({error:"유저를 찾을 수 없습니다."});
  if(user.referred_by)return res.status(400).json({error:"이미 추천인이 등록되어 있습니다."});
  if((data.topups||[]).some(t=>t.discord_id===u.discord_id && t.status==="confirmed"))
    return res.status(400).json({error:"첫 충전 전에만 추천코드를 등록할 수 있습니다."});
  const ref=data.users.find(x=>String(x.referral_code).toUpperCase()===code);
  if(!ref)return res.status(404).json({error:"추천코드를 찾을 수 없습니다."});
  if(String(ref.discord_id)===String(u.discord_id))return res.status(400).json({error:"본인 코드는 사용할 수 없습니다."});
  user.referred_by=ref.discord_id;
  saveData();
  res.json({ok:true, referrer:ref.username});
});
app.get("/api/referral/me",(req,res)=>{
  const u=currentUser(req);
  if(!u)return res.status(401).json({error:"로그인이 필요합니다."});
  const user=findUser(u.discord_id);
  if(!user)return res.status(404).json({error:"유저 없음"});
  if(!user.referral_code){ user.referral_code=crypto.randomBytes(3).toString("hex").toUpperCase(); saveData(); }
  const invited=(data.users||[]).filter(x=>x.referred_by===u.discord_id).length;
  res.json({code:user.referral_code, invited, referred_by:user.referred_by||null});
});
app.get("/api/me/vip",(req,res)=>{
  const u=currentUser(req);
  if(!u)return res.status(401).json({error:"로그인이 필요합니다."});
  const user=findUser(u.discord_id);
  const st=userSpendStats(u.discord_id);
  if(user){user.is_vip=st.isVip;user.vip_level=st.level;user.total_topup=st.topupTotal;user.total_spent=st.spendTotal;}
  saveData();
  const score=st.spendTotal;
  const next=st.nextNeed || VIP_T3;
  const prev=st.autoLevel>=3?VIP_T3:st.autoLevel===2?VIP_T2:st.autoLevel===1?VIP_T1:0;
  const span=Math.max(1, next-prev);
  const progress=st.autoLevel>=3?100:Math.min(100, Math.round((score-prev)/span*100));
  const mk=monthKey();
  const claims=Number((user?.vip_bonus_claims&&user.vip_bonus_claims[mk])||0);
  const limit=VIP_MONTHLY_LIMIT[st.level]||0;
  res.json({
    isVip:st.isVip,
    level:st.level,
    autoLevel:st.autoLevel,
    purchased:st.purchased,
    discount:st.discount,
    thresholds:{1:VIP_T1,2:VIP_T2,3:VIP_T3},
    discounts:VIP_DISC,
    prices:VIP_BUY_PRICE,
    monthlyBonus:VIP_MONTHLY_BONUS,
    monthlyLimit:VIP_MONTHLY_LIMIT,
    claimsThisMonth:claims,
    claimsLeft:Math.max(0, limit-claims),
    topupTotal:st.topupTotal,
    spendTotal:st.spendTotal,
    nextNeed:st.nextNeed,
    progress,
    perks:st.perks.length?st.perks:(VIP_PERKS[1]||[]),
    allPerks:VIP_PERKS,
    note:"※ 누적 구매 금액 기준으로 등급이 적용됩니다. VIP 등급은 중복 적용되지 않으며 가장 높은 등급 혜택이 적용됩니다."
  });
});
app.post("/api/vip/purchase",async(req,res)=>{
  const u=currentUser(req);
  if(!u)return res.status(401).json({error:"로그인이 필요합니다."});
  const level=Math.floor(Number(req.body.level||0));
  if(![1,2,3].includes(level))return res.status(400).json({error:"잘못된 VIP 등급입니다."});
  const user=findUser(u.discord_id);
  if(!user)return res.status(404).json({error:"유저를 찾을 수 없습니다."});
  const st=userSpendStats(u.discord_id);
  if(st.level>=level)return res.status(400).json({error:`이미 VIP${st.level} 이상입니다.`});
  const price=VIP_BUY_PRICE[level];
  user.balance=Number(user.balance||0);
  if(user.balance<price)return res.status(400).json({error:"잔액이 부족합니다.",needTopup:true,balance:user.balance,required:price});
  user.balance-=price;
  user.vip_purchased=Math.max(Number(user.vip_purchased||0), level);
  addPointLog(user.discord_id, -price, `VIP${level} 구매`, {});
  // 활동/주문 로그용 가상 주문
  const o={
    order_no:`VIP-${Date.now().toString(36).toUpperCase()}`,
    user_id:user.id, discord_id:user.discord_id, discord_name:user.username,
    product_id:`vip${level}`, product_name:`VIP ${level} 멤버십`,
    amount:price, status:"completed", completed_at:now(), created_at:now(), updated_at:now(),
    note:"VIP 등급 구매", delivered_save_code:"", delivered_verification_code:""
  };
  data.orders.unshift(o);
  await refreshUserVip(user,{notify:true});
  saveData();
  await discordSendDM(user.discord_id,{
    content:`👑 **VIP ${level} 구매 완료**`,
    embeds:[brandEmbed({
      title:`VIP ${level} 멤버십 활성화`,
      description:`포인트로 VIP ${level}을 구매했습니다.\n할인 ${VIP_DISC[level]}% · 월 보너스 ${VIP_MONTHLY_LIMIT[level]}회`,
      color:0xF59E0B,
      fields:(VIP_PERKS[level]||[]).slice(0,4).map(p=>({name:"혜택",value:p,inline:false}))
    })]
  });
  res.json({ok:true, level:user.vip_level, balance:user.balance});
});
app.post("/api/vip/claim-bonus",async(req,res)=>{
  const u=currentUser(req);
  if(!u)return res.status(401).json({error:"로그인이 필요합니다."});
  const user=findUser(u.discord_id);
  if(!user)return res.status(404).json({error:"유저를 찾을 수 없습니다."});
  const st=userSpendStats(u.discord_id);
  if(st.level<1)return res.status(400).json({error:"VIP만 보너스를 받을 수 있습니다."});
  const mk=monthKey();
  if(!user.vip_bonus_claims) user.vip_bonus_claims={};
  const used=Number(user.vip_bonus_claims[mk]||0);
  const limit=VIP_MONTHLY_LIMIT[st.level]||0;
  if(used>=limit)return res.status(400).json({error:"이번 달 보너스 횟수를 모두 사용했습니다."});
  const amount=VIP_MONTHLY_BONUS[st.level]||0;
  if(amount<=0)return res.status(400).json({error:"보너스 설정이 없습니다."});
  user.vip_bonus_claims[mk]=used+1;
  user.balance=Number(user.balance||0)+amount;
  addPointLog(user.discord_id, amount, `VIP${st.level} 월 보너스`, {month:mk, claim:used+1});
  saveData();
  res.json({ok:true, amount, balance:user.balance, claimsLeft:limit-(used+1)});
});

app.post("/auth/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/wallet",(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const user=findUser(u.discord_id);res.json({balance:Number(user?.balance||0),pending:data.topups.find(t=>t.discord_id===u.discord_id&&t.status==="pending")||null})});
app.post("/api/wallet/topups",async(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const amount=Math.floor(Number(req.body.amount));const depositor=String(req.body.depositor||"").trim().slice(0,50);if(!Number.isFinite(amount)||amount<1000)return res.status(400).json({error:"충전 금액은 1,000원 이상 입력해주세요."});if(!depositor)return res.status(400).json({error:"입금자명을 입력해주세요."});if(data.topups.some(t=>t.discord_id===u.discord_id&&t.status==="pending"))return res.status(400).json({error:"이미 입금 확인 대기 중인 충전 요청이 있습니다."});const bonus=calcTopupBonus(amount);const t={id:crypto.randomUUID(),request_no:`DEP-${Date.now().toString(36).toUpperCase()}`,discord_id:u.discord_id,discord_name:u.username,amount,bonus,depositor,status:"pending",created_at:now()};data.topups.unshift(t);saveData();await discordSendChannel(DEPOSIT_CHANNEL_ID,{
  embeds:[{
    title:"💰 충전 확인 요청",
    color:0x3B82F6,
    fields:[
      {name:"사용자",value:u.username,inline:true},
      {name:"Discord ID",value:String(u.discord_id),inline:true},
      {name:"입금자명",value:depositor,inline:true},
      {name:"충전금액",value:`${amount.toLocaleString("ko-KR")}원`,inline:true},
      ...(bonus>0?[{name:"보너스",value:`+${bonus.toLocaleString("ko-KR")}원 (${TOPUP_BONUS_PERCENT}%)`,inline:true}]:[]),
      {name:"요청번호",value:t.request_no,inline:true}
    ],
    footer:{text:"CATSMARKET · 관리자 패널에서 확인"},
    timestamp:new Date().toISOString()
  }],
  components:[{type:1,components:[{type:2,style:5,label:"관리자 패널 열기",url:`${BASE_URL}/admin`}]}]
});res.json({ok:true,request:t})});
app.get("/api/wallet/history",(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});res.json(data.topups.filter(t=>t.discord_id===u.discord_id).slice(0,30))});

app.post("/api/orders",async(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const p=PRODUCTS.find(x=>x.id===String(req.body.productId));if(!p)return res.status(400).json({error:"상품을 찾을 수 없습니다."});const orderNote=String(req.body.note||"").trim().slice(0,200);const user=findUser(u.discord_id);user.balance=Number(user.balance||0);
let price=Number(p.price); let couponCode=""; let discount=0;
const rawCoupon=String(req.body.couponCode||"").trim().toUpperCase();
if(rawCoupon){
  const c=(data.coupons||[]).find(x=>String(x.code).toUpperCase()===rawCoupon && x.active!==false);
  if(!c)return res.status(400).json({error:"유효하지 않은 쿠폰입니다."});
  if(c.expires_at && new Date(c.expires_at).getTime()<Date.now())return res.status(400).json({error:"만료된 쿠폰입니다."});
  if(c.max_uses!=null && Number(c.used||0)>=Number(c.max_uses))return res.status(400).json({error:"쿠폰 사용 한도가 끝났습니다."});
  if(price<Number(c.min_amount||0))return res.status(400).json({error:`이 쿠폰은 ${Number(c.min_amount).toLocaleString("ko-KR")}원 이상 상품에만 사용 가능합니다.`});
  if(c.type==="fixed") discount=Math.min(price-100, Number(c.value||0));
  else discount=Math.floor(price*Math.min(90,Number(c.value||0))/100);
  discount=Math.max(0,discount); price=Math.max(100, price-discount); couponCode=c.code; c.used=Number(c.used||0)+1;
}
const stVip=userSpendStats(user.discord_id); user.is_vip=stVip.isVip; user.vip_level=stVip.level;
let vipDiscount=0;
if(stVip.level>=1){ const pct=VIP_DISC[stVip.level]||0; vipDiscount=Math.floor(price*pct/100); price=Math.max(100, price-vipDiscount); }
if(user.balance<price)return res.status(400).json({error:"잔액이 부족합니다.",needTopup:true,balance:user.balance,required:price});
const before=user.balance; user.balance-=price; addPointLog(user.discord_id, -price, "상품 구매", {product:p.name, coupon:couponCode||undefined});
const o={order_no:`CATS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,user_id:user.id,discord_id:user.discord_id,discord_name:user.username,product_id:p.id,product_name:p.name,amount:price,original_amount:p.price,discount,vip_discount:vipDiscount,coupon_code:couponCode,priority:stVip.level||0,vip_level:stVip.level||0,note:orderNote,status:"awaiting_credentials",save_code:"",verification_code:"",delivered_save_code:"",delivered_verification_code:"",created_at:now(),updated_at:now(),balance_before:before,balance_after:user.balance};data.orders.unshift(o);await refreshUserVip(user,{notify:true});saveData();addActivity("web",user.username,p.name,o.order_no);await discordSendChannel(PURCHASE_CHANNEL_ID,{
  embeds:[{
    title:"🛒 웹사이트 구매 알림",
    color:0x6366F1,
    fields:[
      {name:"구매자",value:user.username,inline:true},
      {name:"상품",value:p.name,inline:true},
      {name:"금액",value:`${p.price.toLocaleString("ko-KR")}원`,inline:true},
      {name:"주문번호",value:o.order_no,inline:false}
    ],
    footer:{text:"세이브코드 제출 대기 중"},
    timestamp:new Date().toISOString()
  }],
  components:[{type:1,components:[{type:2,style:5,label:"관리자 패널",url:`${BASE_URL}/admin`}]}]
});res.json({ok:true,order:o,product:p,balance:user.balance})});
app.post("/api/orders/:no/credentials",async(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const o=data.orders.find(x=>x.order_no===req.params.no&&x.discord_id===u.discord_id);if(!o)return res.status(404).json({error:"주문을 찾을 수 없습니다."});if(!["awaiting_credentials","credentials_submitted"].includes(o.status))return res.status(400).json({error:"지금은 세이브코드를 입력할 수 없습니다."});const save=String(req.body.saveCode||"").replace(/\s/g,"").slice(0,100);const ver=String(req.body.verificationCode||"").replace(/\s/g,"").slice(0,100);if(!save||!ver)return res.status(400).json({error:"세이브코드와 인증번호를 입력해주세요."});o.save_code=save;o.verification_code=ver;o.status="credentials_submitted";o.updated_at=now();saveData();const credPayload={
  embeds:[{
    title:"🔑 세이브코드 제출됨",
    color:0xF59E0B,
    fields:[
      {name:"사용자",value:o.discord_name,inline:true},
      {name:"상품",value:o.product_name,inline:true},
      {name:"주문번호",value:o.order_no,inline:false},
      {name:"세이브코드",value:"`"+save+"`",inline:false},
      {name:"인증번호",value:"`"+ver+"`",inline:false},
      ...(o.note?[{name:"요청사항",value:o.note,inline:false}]:[])
    ],
    footer:{text:"관리자 패널에서 새 코드 지급"},
    timestamp:new Date().toISOString()
  }],
  components:[{type:1,components:[{type:2,style:5,label:"주문 처리하기",url:`${BASE_URL}/admin`}]}]
};
await discordSendChannel(PURCHASE_CHANNEL_ID,credPayload);
for(const id of ADMIN_IDS)await discordSendDM(id,credPayload);res.json({ok:true,status:o.status})});
app.get("/api/orders",(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});res.json(data.orders.filter(o=>o.discord_id===u.discord_id).slice(0,50))});

app.get("/api/reviews",(req,res)=>res.json(data.reviews.slice(0,50)));
app.post("/api/reviews",(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const body=String(req.body.body||"").trim().slice(0,500);if(!body)return res.status(400).json({error:"후기를 입력해주세요."});const rating=Math.max(1,Math.min(5,Number(req.body.rating||5)));data.reviews.unshift({id:crypto.randomUUID(),user_id:u.id,discord_name:u.username,rating,body,created_at:now()});saveData();res.json({ok:true})});
app.delete("/api/reviews/:id",(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const i=data.reviews.findIndex(r=>r.id===req.params.id);if(i<0)return res.status(404).json({error:"후기를 찾을 수 없습니다."});if(!admin(req)&&data.reviews[i].user_id!==u.id)return res.status(403).json({error:"삭제 권한이 없습니다."});data.reviews.splice(i,1);saveData();res.json({ok:true})});
app.get("/api/notices",(req,res)=>res.json(data.notices.slice(0,50)));
app.post("/api/admin/notices",(req,res)=>{if(!admin(req))return res.status(403).json({error:"관리자 권한이 없습니다."});const title=String(req.body.title||"").trim().slice(0,100),body=String(req.body.body||"").trim().slice(0,3000);if(!title||!body)return res.status(400).json({error:"제목과 내용을 입력해주세요."});const n={id:crypto.randomUUID(),title,body,author:currentUser(req).username,created_at:now()};data.notices.unshift(n);saveData();res.json({ok:true,notice:n})});
app.delete("/api/admin/notices/:id",(req,res)=>{if(!admin(req))return res.status(403).json({error:"관리자 권한이 없습니다."});const i=data.notices.findIndex(n=>n.id===req.params.id);if(i<0)return res.status(404).json({error:"공지를 찾을 수 없습니다."});data.notices.splice(i,1);saveData();res.json({ok:true})});

app.get("/api/support",(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const t=data.tickets.find(t=>t.user_id===u.id&&t.status!=="closed")||null;const messages=t?data.messages.filter(m=>m.ticket_id===t.id).sort((a,b)=>a.created_at.localeCompare(b.created_at)):[];res.json({ticket:t,messages})});
app.post("/api/support",async(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const body=String(req.body.body||"").trim().slice(0,2000);const subject=String(req.body.subject||"일반 문의").trim().slice(0,100);if(!body)return res.status(400).json({error:"메시지를 입력해주세요."});let t=data.tickets.find(t=>t.user_id===u.id&&t.status!=="closed");if(!t){t={id:crypto.randomUUID(),ticket_no:`CS-${Date.now().toString(36).toUpperCase()}`,user_id:u.id,discord_id:u.discord_id,discord_name:u.username,subject,status:"open",created_at:now(),updated_at:now()};data.tickets.unshift(t)}t.subject=subject;t.status="open";t.updated_at=now();data.messages.push({id:crypto.randomUUID(),ticket_id:t.id,sender_id:u.id,sender_name:u.username,sender_role:"user",body,created_at:now()});saveData();const supportPayload={
  embeds:[{
    title:"💬 새 고객 문의",
    color:0x8B5CF6,
    fields:[
      {name:"사용자",value:u.username,inline:true},
      {name:"제목",value:subject,inline:true},
      {name:"티켓",value:t.ticket_no,inline:true},
      {name:"내용",value:body.slice(0,1000),inline:false}
    ],
    timestamp:new Date().toISOString()
  }],
  components:[{type:1,components:[{type:2,style:5,label:"관리자 패널",url:`${BASE_URL}/admin`}]}]
};
for(const id of ADMIN_IDS)await discordSendDM(id,supportPayload);res.json({ok:true,ticket:t})});
app.post("/api/support/close",(req,res)=>{const u=currentUser(req);if(!u)return res.status(401).json({error:"로그인이 필요합니다."});const t=data.tickets.find(t=>t.user_id===u.id&&t.status!=="closed");if(!t)return res.status(404).json({error:"열린 문의가 없습니다."});t.status="closed";t.updated_at=now();saveData();res.json({ok:true})});

app.get("/api/admin/stats",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});res.json({users:data.users.length,orders:data.orders.length,pendingOrders:data.orders.filter(o=>!['completed','cancelled'].includes(o.status)).length,revenue:data.orders.filter(o=>o.status!=="cancelled").reduce((a,o)=>a+Number(o.amount||0),0),topupPending:data.topups.filter(t=>t.status==="pending").length,openTickets:data.tickets.filter(t=>t.status!=="closed").length,reviews:data.reviews.length,notices:data.notices.length})});
app.get("/api/admin/topups",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});res.json(data.topups.slice(0,100))});
app.patch("/api/admin/topups/:id",async(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});const t=data.topups.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"충전 요청을 찾을 수 없습니다."});const status=String(req.body.status||"");if(!['confirmed','rejected'].includes(status))return res.status(400).json({error:"잘못된 상태입니다."});if(t.status!=="pending")return res.status(400).json({error:"이미 처리된 요청입니다."});t.status=status;t.confirmed_at=now();if(status==="confirmed"){const u=findUser(t.discord_id);if(u){
  const bonus=Number(t.bonus!=null?t.bonus:calcTopupBonus(t.amount));
  t.bonus=bonus;
  const credit=Number(t.amount||0)+bonus;
  u.balance=Number(u.balance||0)+credit;
  t.balance_after=u.balance;
  addPointLog(t.discord_id, Number(t.amount||0), "포인트 충전", {request_no:t.request_no});
  if(bonus>0) addPointLog(t.discord_id, bonus, "충전 보너스", {request_no:t.request_no, percent:TOPUP_BONUS_PERCENT});
  await refreshUserVip(u,{notify:true});
  // 추천 보상: 피추천인 첫 확정 충전 시 추천인 +500
  if(u.referred_by && !u.referral_rewarded){
    const ref=findUser(u.referred_by);
    if(ref){
      ref.balance=Number(ref.balance||0)+500;
      addPointLog(ref.discord_id, 500, "추천 보상", {from:u.username});
      u.referral_rewarded=true;
      discordSendDM(ref.discord_id,{embeds:[{title:"🎁 추천 보상 +500원",description:`${u.username} 님이 첫 충전을 완료했습니다.`,color:0x22C55E}]});
    }
  }
}}saveData();if(status==="confirmed")await discordSendDM(t.discord_id,{
  content:"💰 **포인트가 충전되었습니다!**",
  embeds:[brandEmbed({
    title:"충전 완료",
    description:"입금이 확인되어 포인트가 지급되었습니다.\n지금 바로 상점에서 구매해 보세요!",
    color:0x16A34A,
    fields:[
      {name:"충전 금액",value:`**${Number(t.amount).toLocaleString("ko-KR")}원**`,inline:true},
      ...(Number(t.bonus||0)>0?[{name:"보너스",value:`**+${Number(t.bonus).toLocaleString("ko-KR")}원**`,inline:true}]:[]),
      {name:"현재 잔액",value:`**${Number(t.balance_after||0).toLocaleString("ko-KR")}원**`,inline:true}
    ]
  })],
  components:[{type:1,components:[
    {type:2,style:5,label:"🛒 상점 바로가기",url:BASE_URL},
    {type:2,style:5,label:"📦 내 주문",url:`${BASE_URL}/#orders`}
  ]}]
});res.json({ok:true})});

app.get("/api/admin/orders",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});res.json(data.orders.slice(0,200))});
app.patch("/api/admin/orders/:no",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});const o=data.orders.find(x=>x.order_no===req.params.no);if(!o)return res.status(404).json({error:"주문을 찾을 수 없습니다."});const status=String(req.body.status||"");if(!['awaiting_credentials','credentials_submitted','processing','cancelled'].includes(status))return res.status(400).json({error:"잘못된 상태입니다."});if(status==="cancelled"&&o.status!=="cancelled"&&o.status!=="completed"){const u=findUser(o.discord_id);if(u){u.balance=Number(u.balance||0)+Number(o.amount||0);addPointLog(o.discord_id, Number(o.amount||0), "주문 취소 환불", {order_no:o.order_no});}}o.status=status;o.updated_at=now();saveData();res.json({ok:true,order:o})});
app.post("/api/admin/orders/:no/deliver",async(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});const o=data.orders.find(x=>x.order_no===req.params.no);if(!o)return res.status(404).json({error:"주문을 찾을 수 없습니다."});if(!['credentials_submitted','processing'].includes(o.status))return res.status(400).json({error:"먼저 주문을 처리 상태로 바꿔주세요."});const save=String(req.body.saveCode||"").replace(/\s/g,"").slice(0,100),ver=String(req.body.verificationCode||"").replace(/\s/g,"").slice(0,100);if(!save||!ver)return res.status(400).json({error:"새 세이브코드와 인증번호를 입력해주세요."});o.delivered_save_code=save;o.delivered_verification_code=ver;o.status="completed";o.completed_at=now();o.updated_at=now();saveData();await discordSendDM(o.discord_id,{
  content:"🎉 **주문 처리가 완료되었습니다!**",
  embeds:[brandEmbed({
    title:"세이브코드가 도착했어요",
    description:"아래 코드를 복사해 게임에 입력해 주세요.\n문제가 있으면 사이트 문의 또는 DM으로 연락 주세요.",
    color:0x2563EB,
    fields:[
      {name:"상품",value:o.product_name,inline:true},
      {name:"주문번호",value:"`"+o.order_no+"`",inline:true},
      {name:"세이브코드",value:"```"+save+"```",inline:false},
      {name:"인증번호",value:"```"+ver+"```",inline:false}
    ],
    footer:{text:"이용해 주셔서 감사합니다 🐱 CATSMARKET"}
  })],
  components:reviewComponents()
});res.json({ok:true,order:o})});

app.get("/api/admin/support",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});res.json(data.tickets.slice(0,100).map(t=>({...t,messages:data.messages.filter(m=>m.ticket_id===t.id).sort((a,b)=>a.created_at.localeCompare(b.created_at))})))});
app.post("/api/admin/support/:id",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});const t=data.tickets.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"문의를 찾을 수 없습니다."});const body=String(req.body.body||"").trim().slice(0,2000);if(!body)return res.status(400).json({error:"답변 내용을 입력해주세요."});data.messages.push({id:crypto.randomUUID(),ticket_id:t.id,sender_id:currentUser(req).id,sender_name:currentUser(req).username,sender_role:"admin",body,created_at:now()});t.status="open";t.updated_at=now();saveData();discordSendDM(t.discord_id,{
  content:"💬 **고객센터에서 답변이 도착했습니다.**",
  embeds:[brandEmbed({
    title:"고객센터 답변",
    color:0x4F46E5,
    fields:[
      {name:"티켓 번호",value:"`"+t.ticket_no+"`",inline:true},
      {name:"답변 내용",value:body.slice(0,1000),inline:false}
    ],
    footer:{text:"CATSMARKET 고객센터"}
  })],
  components:[{type:1,components:[{type:2,style:5,label:"사이트에서 이어쓰기",url:`${BASE_URL}/#support`}]}]
});res.json({ok:true})});
app.patch("/api/admin/support/:id",(req,res)=>{if(!admin(req))return res.status(403).json({error:"권한이 없습니다."});const t=data.tickets.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"문의를 찾을 수 없습니다."});t.status=['open','closed'].includes(String(req.body.status))?String(req.body.status):t.status;t.updated_at=now();saveData();res.json({ok:true})});

app.post("/api/bridge/purchase",(req,res)=>{if(!WEB_SECRET||String(req.get("X-CATSMARKET-SECRET")||"")!==WEB_SECRET)return res.status(403).json({error:"bridge secret mismatch"});const b=req.body||{};const item=addActivity("discord",String(b.discordName||"냥코 유저 한분"),String(b.productName||"상품"),String(b.orderNo||""));res.json({ok:true,item})});
app.post("/api/bridge/delivered",(req,res)=>{if(!WEB_SECRET||String(req.get("X-CATSMARKET-SECRET")||"")!==WEB_SECRET)return res.status(403).json({error:"bridge secret mismatch"});const b=req.body||{};const o=data.orders.find(x=>x.order_no===String(b.orderNo));if(o){o.delivered_save_code=String(b.saveCode||"");o.delivered_verification_code=String(b.verificationCode||"");o.status="completed";o.completed_at=now();o.updated_at=now();saveData()}res.json({ok:true})});

app.get("/admin",(req,res)=>{if(!admin(req))return res.status(403).send("관리자만 접근할 수 있습니다.");res.sendFile(path.join(__dirname,"public","admin.html"))});
app.listen(PORT,()=>console.log(`CATSMARKET WEB running: ${BASE_URL}`));
