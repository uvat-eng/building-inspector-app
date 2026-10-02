/**
 * Встроенная покупка полного доступа через App Store.
 *
 * Сама оплата проходит в iPhone-приложении системным окном Apple. Приложение
 * возвращает подписанную Apple транзакцию, сервер проверяет подпись и только
 * после этого открывает компании полный доступ.
 */

export const IAP_PRODUCT_ID = 'inspector_sk_full';

type IapBridge = { postMessage: (v: unknown) => void };

type IapWindow = Window & {
  webkit?: { messageHandlers?: { iap?: IapBridge } };
  __iapResult?: (r: IapResult) => void;
};

export interface IapResult {
  ok: boolean;
  /** Подписанная транзакция StoreKit 2 (JWS). */
  jws?: string;
  /** Цена в валюте магазина пользователя — для подписи на кнопке. */
  price?: string;
  error?: 'cancelled' | 'pending' | 'not_found' | 'unavailable' | 'failed';
}

/** Покупки возможны только внутри iPhone-приложения из App Store. */
export const canPurchase = () => {
  if (typeof window === 'undefined') return false;
  return Boolean((window as IapWindow).webkit?.messageHandlers?.iap);
};

const ask = (action: 'buy' | 'restore' | 'price') =>
  new Promise<IapResult>((resolve) => {
    const w = window as IapWindow;
    const bridge = w.webkit?.messageHandlers?.iap;
    if (!bridge) {
      resolve({ ok: false, error: 'unavailable' });
      return;
    }
    // Окно оплаты может висеть долго — пользователь вводит пароль или Face ID.
    const timer = window.setTimeout(() => resolve({ ok: false, error: 'failed' }), 5 * 60 * 1000);
    w.__iapResult = (r) => {
      window.clearTimeout(timer);
      w.__iapResult = undefined;
      resolve(r);
    };
    bridge.postMessage({ action, productId: IAP_PRODUCT_ID });
  });

export const buyFullAccess = () => ask('buy');
export const restorePurchase = () => ask('restore');
export const fetchPrice = () => ask('price');
