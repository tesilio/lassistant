# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Telegram 봇 기반의 알림 서비스로, AWS Lambda + Serverless Framework로 배포됩니다. 매일 아침 IT/과학 뉴스와 날씨 정보를 Telegram 채널로 전송합니다.

## 명령어

```bash
# 패키지 매니저: yarn
yarn install           # 의존성 설치
yarn run build        # TypeScript 빌드 (tsconfig.build.json 사용)
yarn run test         # 전체 테스트 실행
yarn run test -- src/specs/TelegramBot.spec.ts  # 단일 테스트 파일 실행

# 로컬 개발
yarn run offline-production  # Serverless Offline으로 로컬 실행

# 배포
yarn run sls deploy --stage production  # 프로덕션 배포
```

## 아키텍처

### Lambda 함수 (3개)
- `webhook`: Telegram 봇 명령어 처리 (HTTP 엔드포인트)
- `dailyNews`: 매일 07:00(KST) IT/과학 뉴스 크롤링 및 전송
- `dailyWeather`: 매일 07:00(KST) 날씨 정보 수집 및 전송

### 핵심 모듈
```
src/
├── handlers/           # Lambda 핸들러 (진입점)
│   ├── webhook.ts     # Telegram 웹훅 처리
│   ├── dailyNews.ts   # 뉴스 스케줄러
│   └── dailyWeather.ts # 날씨 스케줄러
├── TelegramBot.ts     # Telegram 메시지 발송 (Telegraf 래퍼)
├── Webhook.ts         # Telegram 명령어 라우팅
├── DailyNews.ts       # 네이버 뉴스 크롤링 + OpenAI 요약
├── DailyWeather.ts    # 날씨 정보 통합 및 메시지 생성
├── WeatherAPIManager.ts  # 기상청 API (초단기실황, 단기예보)
├── AirKoreaManager.ts    # 에어코리아 API (대기질)
├── OpenAIManager.ts      # OpenAI API (뉴스 요약, 옷차림 추천)
├── RedisManager.ts       # Redis 캐시 (현재 비활성화)
└── MongoDBManager.ts     # MongoDB 연결 (현재 비활성화)
config/
└── environment.ts     # 환경 변수 관리
```

### 외부 API 연동
- **기상청 API**: 초단기실황(`getUltraSrtNcst`), 단기예보(`getVilageFcst`)
- **에어코리아 API**: 실시간 대기질 정보
- **OpenAI API**: 뉴스 요약 (gpt-4o-mini), 옷차림 추천
- **Telegram Bot API**: Telegraf 라이브러리 사용

### 싱글톤 패턴
`WeatherAPIManager`, `AirKoreaManager`, `OpenAIManager`, `RedisManager`, `MongoDBManager`는 싱글톤 패턴으로 구현되어 있습니다. `getInstance()` 메서드로 인스턴스를 획득합니다.

## 환경 변수

`env/{stage}.json` 파일에서 관리:
- `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_OWNER_CHAT_ID`
- `DATA_GO_API_KEY` (기상청/에어코리아 공통)
- `WEATHER_NX`, `WEATHER_NY`, `WEATHER_STATION` (날씨 좌표/측정소)
- `OPENAI_API_KEY`
- `REDIS_*`, `MONGO_URI` (현재 비활성화)

## 테스트

- Jest + ts-jest 사용
- 테스트 파일: `src/specs/*.spec.ts`
- Mock 라이브러리: `axios-mock-adapter`, `ioredis-mock`
