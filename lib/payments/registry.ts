/**
 * Provider 레지스트리 — 라우터에서 import.
 * provider-interface.ts 와 분리한 이유: provider 구현체가 interface 를
 * 가져오면서 동시에 registry 가 구현체를 가져오면 순환 의존이 됨.
 */

import type { PaymentProvider, PaymentProviderName } from "./provider-interface";
import { stripeProvider } from "./providers/stripe";
import { paypalProvider } from "./providers/paypal";
import { tossProvider } from "./providers/toss";

export function getProvider(name: PaymentProviderName): PaymentProvider {
  switch (name) {
    case "stripe": return stripeProvider;
    case "paypal": return paypalProvider;
    case "toss":   return tossProvider;
  }
}
