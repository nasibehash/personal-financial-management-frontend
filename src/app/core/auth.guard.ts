import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth-store';

/** Only for signed-in users; everyone else is sent to the login page and brought back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthStore);
  if (store.hasValidSession()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], {
    queryParams: state.url === '/' ? {} : { returnUrl: state.url },
  });
};

/** Only for visitors (login and register); signed-in users go to the dashboard. */
export const guestGuard: CanActivateFn = () => {
  return inject(AuthStore).hasValidSession() ? inject(Router).createUrlTree(['/']) : true;
};

/** Only follow return URLs inside the app. */
export function safeReturnUrl(url: string | null | undefined): string {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
