# Gemini 코드 리뷰 스타일 가이드 (Gemini Code Review Style Guide)

## 리뷰 기본 원칙 (Core Principles)

**모든 코드 리뷰는 반드시 한국어로 작성되어야 합니다.**  
**All code reviews must be written in Korean.**

**리뷰는 간결하고 명확하게 작성해야 합니다.**  
**Write reviews as concisely and clearly as possible.**

- 장황한 설명보다 핵심적인 개선 포인트를 짚는 것이 좋습니다.
- 불필요한 감정 표현, 중복된 설명은 피하고 요점을 먼저 전달합니다.

---

## 리뷰 코멘트 예시 (Code Review Comment Examples)

좋은 예 (간결 + 한글):
```md
이 부분은 null 체크가 필요해 보입니다. `?.` 또는 조건문 추가를 권장합니다.
```
