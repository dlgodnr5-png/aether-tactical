/**
 * Provider 자동 추천 — 사용자 locale 기반.
 *
 *  - KR (한국) → toss 우선 (KRW 친숙)
 *  - 그 외     → paypal 우선 (글로벌)
 *  - 항상 stripe 도 옵션 제공 (카드 백업)
 *
 * 사용자가 명시적으로 선택한 provider 가 있으면 그것이 최우선.
 */

import type { PaymentProviderName } from "./provider-interface";

export function recommendProviderFromHeaders(headers: Headers): PaymentProviderName {
  const acceptLang = headers.get("accept-language")?.toLowerCase() ?? "";
  if (acceptLang.startsWith("ko") || acceptLang.includes("ko-kr")) {
    return "toss";
  }
  return "paypal";
}

export function isValidProvider(name: string | undefined | null): name is PaymentProviderName {
  return name === "stripe" || name === "paypal" || name === "toss";
}
