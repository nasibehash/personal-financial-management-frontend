import { HttpErrorResponse } from '@angular/common/http';

interface ProblemBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

/** A user-facing (Persian) message for a failed request. */
export function describeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.';
  }

  const body = (typeof error.error === 'object' && error.error ? error.error : {}) as ProblemBody;
  const detail = body.detail?.trim();
  const withDetail = (lead: string) => (detail ? `${lead} (${detail})` : lead);

  switch (error.status) {
    case 0:
      return 'ارتباط با سرور برقرار نشد. اینترنت یا آدرس سرور را بررسی کنید.';
    case 400: {
      const fieldMessages = Object.values(body.errors ?? {}).flat();
      return fieldMessages.length > 0
        ? `اطلاعات واردشده معتبر نیست: ${[...new Set(fieldMessages)].join(' ')}`
        : withDetail('درخواست قابل انجام نیست.');
    }
    case 401:
      return withDetail('ایمیل یا رمز عبور درست نیست، یا نشست شما تمام شده است.');
    case 403:
      return 'به این بخش دسترسی ندارید.';
    case 404:
      return withDetail('مورد درخواستی پیدا نشد.');
    case 409:
      return withDetail('این مورد تکراری است یا در حال استفاده است.');
    case 503:
      return withDetail('سرویس موقتاً در دسترس نیست.');
    default:
      return error.status >= 500
        ? 'خطایی در سرور رخ داد. کمی بعد دوباره تلاش کنید.'
        : 'درخواست انجام نشد.';
  }
}
