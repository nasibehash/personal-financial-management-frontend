import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api-client';
import { AuthStore } from './auth-store';

/** Sends the token with every API call and signs the user out when the API says the session is no longer valid. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  const base = inject(API_BASE_URL);

  const isApiCall = request.url.startsWith(base);
  const isCredentialsCall =
    request.url.startsWith(`${base}/auth/login`) || request.url.startsWith(`${base}/auth/register`);
  const token = store.token();

  const authorized =
    isApiCall && !isCredentialsCall && token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isApiCall &&
        !isCredentialsCall &&
        store.isAuthenticated()
      ) {
        store.logout(router.url);
      }
      return throwError(() => error);
    }),
  );
};
