import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from './api-client';
import { AuthResponse, LoginRequest, RegisterRequest, User } from './models';
import { safeGet, safeRemove, safeSet } from './safe-storage';

const STORAGE_KEY = 'pfm.auth';

interface Session {
  token: string;
  expiresAtUtc: string;
  user: User;
}

function isExpired(session: Session): boolean {
  return Date.parse(session.expiresAtUtc) <= Date.now();
}

function readStoredSession(): Session | null {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const session = JSON.parse(raw) as Session;
    if (
      typeof session.token === 'string' &&
      typeof session.expiresAtUtc === 'string' &&
      session.user?.id &&
      !isExpired(session)
    ) {
      return session;
    }
  } catch {
    // fall through: a corrupt value is treated as "not signed in"
  }
  safeRemove(STORAGE_KEY);
  return null;
}

/** Who is signed in. The session (JWT + user) is kept in localStorage until it expires or the user signs out. */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);

  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  async login(request: LoginRequest): Promise<void> {
    this.start(await firstValueFrom(this.api.login(request)));
  }

  async register(request: RegisterRequest): Promise<void> {
    this.start(await firstValueFrom(this.api.register(request)));
  }

  /** True while the stored token is still valid; an expired session is cleared as a side effect. */
  hasValidSession(): boolean {
    const session = this.session();
    if (session && isExpired(session)) {
      this.clear();
      return false;
    }
    return session !== null;
  }

  /** Signs out and goes to the login page, remembering where the user was. */
  logout(returnUrl?: string): void {
    this.clear();
    void this.router.navigate(['/login'], {
      queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {},
    });
  }

  private start(response: AuthResponse): void {
    const session: Session = {
      token: response.token,
      expiresAtUtc: response.expiresAtUtc,
      user: response.user,
    };
    this.session.set(session);
    safeSet(STORAGE_KEY, JSON.stringify(session));
  }

  private clear(): void {
    this.session.set(null);
    safeRemove(STORAGE_KEY);
  }
}
