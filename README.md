# Lassistant Telegram Bot(TODO)

---

### 개발환경 설정
1. BotFather와 대화시작
    - http://t.me/BotFather
2. 새로운 봇 생성
    - /newbot
3. 봇 이름 입력
    - 나중에 변경 할 수 있다.
4. 봇 계정명(username) 입력
    - 변경 할 수 없다.
    - 반드시 `Bot`이나 `bot`으로 끝나야 한다.
    - 예) `TestBot` 혹은 `test_bot`
5. token을 저장해둔다.
6. 1:1 대화 시작
    - t.me/<봇 계정명>

### 웹훅
- 예) https://test.execute-api.ap-northeast-2.amazonaws.com/bot/
```
# <token> 부분을 봇 등록 시 발급받은 토큰으로 대치한다.

# 웹훅 URL 등록
curl -F "url=https://test.execute-api.ap-northeast-2.amazonaws.com/bot/" https://api.telegram.org/bot<token>/setWebhook

# 등록되어 있는 모든 웹훅 URL 삭제
curl https://api.telegram.org/bot<token>/setWebhook

# 혹은
node setWebhook
```