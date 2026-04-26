/**
 * 결제 Provider 공용 인터페이스 — 일회성 결제 (aether-tactical 전용).
 *
 * 무기고의 unified-subscription-panel 스킬은 구독 모델 — 여기는 일회성 $1.
 * 모든 provider 가 동일한 createPayment 시그니처를 구현하여 라우팅 분기 단순화.
 */

export type ProductKind = "unlimited" | "missile_pack";
export type PaymentProviderName = "stripe" | "paypal" | "toss";

export interface PaymentRequest {
  /** 어떤 상품을 결제하나 */
  product: ProductKind;
  /** USD 단위 금액. 현재 둘 다 1.00 (단순화) */
  amountUsd: number;
  /** 결제 후 돌아올 origin (req.nextUrl.origin) */
  returnOrigin: string;
  /** session 추적용 idempotency key (UUID) — 중복 reload 방지 */
  idempotencyKey: string;
}

export interface TossClientPayload {
  sdk: "toss";
  clientKey: string;
  method: "카드";
  amount: number;          // KRW
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}

export interface PaymentResponse {
  provider: PaymentProviderName;
  /** 사용자가 이동할 URL (Stripe Checkout / PayPal approve) */
  url?: string;
  /** Toss 같이 클라이언트 SDK 호출이 필요한 경우 */
  clientPayload?: TossClientPayload;
  /** 우리 내부 추적용 */
  sessionId?: string;
  status: "ok" | "client_action_required" | "failed";
  error?: string;
}

export interface WebhookOutcome {
  product: ProductKind;
  /** Provider 의 payment id — idempotency 추적 */
  paymentId: string;
  /** $1 = 100 cents */
  amountCents: number;
  status: "succeeded" | "failed";
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** 결제 세션 생성. status="ok" 면 url 로 redirect, "client_action_required" 면 clientPayload 로 SDK 호출. */
  createPayment(req: PaymentRequest): Promise<PaymentResponse>;
  /** webhook 서명 검증 — 신뢰 가능한 이벤트만 처리. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
  /** webhook 이벤트 → 표준화된 결과 (server-side 에서 cookie set / unlock). */
  parseWebhookEvent(rawBody: string): Promise<WebhookOutcome | null>;
}

export const PROVIDER_NAMES: PaymentProviderName[] = ["stripe", "paypal", "toss"];
