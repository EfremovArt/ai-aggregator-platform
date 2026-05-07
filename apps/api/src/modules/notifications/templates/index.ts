/**
 * Plain-string templates for transactional notifications.
 * Kept inline (no Handlebars) so the build stays simple and there is zero
 * runtime template-injection surface. Localised in Russian by default — we
 * branch on the user's `preferredLocale` if/when more languages are added.
 */

export interface TemplatePayload {
  email: string;
  displayName: string | null;
  appUrl: string;
}

const wrap = (
  title: string,
  bodyHtml: string,
): string => `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0b0b14;color:#e7e7f5">
<div style="background:linear-gradient(180deg,#13132a,#0b0b14);border:1px solid #1f1f3a;border-radius:16px;padding:24px">
  <h2 style="margin:0 0 16px 0;font-size:20px">${title}</h2>
  ${bodyHtml}
</div>
<p style="font-size:12px;color:#888;margin-top:16px;text-align:center">
  AI Aggregator Platform · <a href="" style="color:#888">unsubscribe in settings</a>
</p>
</body></html>`;

export function emailVerificationTemplate(payload: TemplatePayload, verifyUrl: string) {
  const greeting = payload.displayName ? `Привет, ${payload.displayName}!` : 'Привет!';
  return {
    subject: 'Подтвердите email на AI Aggregator',
    text: `${greeting}\n\nПодтвердите email, перейдя по ссылке:\n${verifyUrl}\n\nСсылка действительна 24 часа.`,
    html: wrap(
      'Подтвердите email',
      `<p>${greeting}</p>
       <p>Спасибо за регистрацию. Перейдите по ссылке, чтобы подтвердить email и активировать аккаунт:</p>
       <p><a href="${verifyUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Подтвердить email</a></p>
       <p style="color:#888;font-size:12px">Ссылка действительна 24 часа.</p>`,
    ),
  };
}

export function lowBalanceTemplate(payload: TemplatePayload, balanceUsd: number, threshold: number) {
  return {
    subject: `Баланс ниже $${threshold.toFixed(2)} — пополните, чтобы не прерывать запросы`,
    text: `Текущий баланс: $${balanceUsd.toFixed(2)}\nПорог уведомления: $${threshold.toFixed(2)}\n\nПополнить: ${payload.appUrl}/dashboard/billing`,
    html: wrap(
      'Низкий баланс',
      `<p>Текущий баланс: <b>$${balanceUsd.toFixed(2)}</b> (порог $${threshold.toFixed(2)}).</p>
       <p>Чтобы запросы не прерывались, пополните счёт:</p>
       <p><a href="${payload.appUrl}/dashboard/billing" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Пополнить</a></p>`,
    ),
  };
}

export function hardCutoffTemplate(payload: TemplatePayload, balanceUsd: number) {
  return {
    subject: 'Запрос отклонён: недостаточно средств',
    text: `Запрос отклонён hard-cutoff'ом. Текущий баланс: $${balanceUsd.toFixed(2)}\n\nПополните: ${payload.appUrl}/dashboard/billing`,
    html: wrap(
      'Недостаточно средств',
      `<p>Запрос был отклонён, чтобы не превысить лимит расходов.</p>
       <p>Текущий баланс: <b>$${balanceUsd.toFixed(2)}</b>.</p>
       <p><a href="${payload.appUrl}/dashboard/billing" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Пополнить</a></p>`,
    ),
  };
}

export function paymentSuccessTemplate(
  payload: TemplatePayload,
  amountUsd: number,
  newBalanceUsd: number,
  provider: string,
) {
  return {
    subject: `Платёж зачислен: +$${amountUsd.toFixed(2)}`,
    text: `Платёж через ${provider} зачислен на баланс.\nЗачислено: $${amountUsd.toFixed(2)}\nНовый баланс: $${newBalanceUsd.toFixed(2)}\n\nИстория: ${payload.appUrl}/dashboard/billing`,
    html: wrap(
      'Платёж получен',
      `<p>Спасибо за пополнение!</p>
       <table style="width:100%;font-size:14px">
         <tr><td>Способ:</td><td><b>${provider}</b></td></tr>
         <tr><td>Зачислено:</td><td><b>$${amountUsd.toFixed(2)}</b></td></tr>
         <tr><td>Новый баланс:</td><td><b>$${newBalanceUsd.toFixed(2)}</b></td></tr>
       </table>
       <p style="margin-top:16px"><a href="${payload.appUrl}/dashboard/billing" style="color:#7c3aed">Открыть историю операций</a></p>`,
    ),
  };
}

export function refundTemplate(payload: TemplatePayload, amountUsd: number) {
  return {
    subject: `Возврат оформлен: $${amountUsd.toFixed(2)}`,
    text: `Возврат на $${amountUsd.toFixed(2)} оформлен. Деньги вернутся на способ оплаты в течение 5–14 дней.`,
    html: wrap(
      'Возврат оформлен',
      `<p>Возврат на сумму <b>$${amountUsd.toFixed(2)}</b> оформлен.</p>
       <p>Деньги вернутся на способ оплаты в течение 5–14 дней (зависит от банка).</p>`,
    ),
  };
}

/* Telegram-specific (plain text, no HTML) */
export function tgEmailVerification(verifyUrl: string) {
  return `<b>AI Aggregator</b>\nПодтвердите email: ${verifyUrl}\nСсылка действует 24 часа.`;
}
export function tgLowBalance(balanceUsd: number, threshold: number, appUrl: string) {
  return `⚠️ <b>Низкий баланс</b>\nТекущий: $${balanceUsd.toFixed(2)} (порог $${threshold.toFixed(2)})\nПополнить: ${appUrl}/dashboard/billing`;
}
export function tgHardCutoff(balanceUsd: number, appUrl: string) {
  return `🛑 <b>Запрос отклонён</b>\nНедостаточно средств. Баланс: $${balanceUsd.toFixed(2)}\nПополнить: ${appUrl}/dashboard/billing`;
}
export function tgPaymentSuccess(amountUsd: number, newBalanceUsd: number, provider: string) {
  return `✅ <b>Платёж зачислен</b>\nСпособ: ${provider}\nСумма: +$${amountUsd.toFixed(2)}\nНовый баланс: $${newBalanceUsd.toFixed(2)}`;
}
export function tgRefund(amountUsd: number) {
  return `↩️ <b>Возврат оформлен</b>: $${amountUsd.toFixed(2)}`;
}
