import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Account,
  AccountRequest,
  AiTransactionResult,
  AuthResponse,
  Category,
  CategoryBreakdown,
  CategoryType,
  FinancialInsights,
  FinancialSummary,
  Goal,
  GoalContribution,
  GoalDetail,
  GoalRequest,
  GoalStatus,
  LoginRequest,
  Paged,
  PeriodComparison,
  RegisterRequest,
  Transaction,
  TransactionFilter,
  TransactionRequest,
  User,
} from './models';

/** Base URL of the API. In development `/api` is proxied to the backend (proxy.conf.json); on Vercel it is rewritten (vercel.json). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

type Query = Record<string, string | number | boolean | null | undefined>;

function toParams(query: Query): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  readonly base = inject(API_BASE_URL);

  // ---- auth
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/register`, request);
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, request);
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.base}/auth/me`);
  }

  // ---- categories
  categories(type?: CategoryType): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`, { params: toParams({ type }) });
  }

  createCategory(name: string, type: CategoryType): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, { name, type });
  }

  renameCategory(id: string, name: string): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${id}`, { name });
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  // ---- accounts
  accounts(includeArchived = false): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.base}/accounts`, {
      params: toParams({ includeArchived }),
    });
  }

  createAccount(request: AccountRequest): Observable<Account> {
    return this.http.post<Account>(`${this.base}/accounts`, request);
  }

  updateAccount(id: string, request: AccountRequest): Observable<Account> {
    return this.http.put<Account>(`${this.base}/accounts/${id}`, request);
  }

  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/accounts/${id}`);
  }

  // ---- transactions
  transactions(filter: TransactionFilter = {}): Observable<Paged<Transaction>> {
    return this.http.get<Paged<Transaction>>(`${this.base}/transactions`, {
      params: toParams({ ...filter }),
    });
  }

  createTransaction(request: TransactionRequest): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.base}/transactions`, request);
  }

  updateTransaction(id: string, request: TransactionRequest): Observable<Transaction> {
    return this.http.put<Transaction>(`${this.base}/transactions/${id}`, request);
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/transactions/${id}`);
  }

  // ---- reports (from/to are ISO days, both inclusive)
  summary(from?: string, to?: string): Observable<FinancialSummary> {
    return this.http.get<FinancialSummary>(`${this.base}/reports/summary`, {
      params: toParams({ from, to }),
    });
  }

  categoryBreakdown(type: CategoryType, from?: string, to?: string): Observable<CategoryBreakdown> {
    return this.http.get<CategoryBreakdown>(`${this.base}/reports/category-breakdown`, {
      params: toParams({ type, from, to }),
    });
  }

  comparison(from?: string, to?: string): Observable<PeriodComparison> {
    return this.http.get<PeriodComparison>(`${this.base}/reports/comparison`, {
      params: toParams({ from, to }),
    });
  }

  // ---- goals
  goals(status?: GoalStatus): Observable<Goal[]> {
    return this.http.get<Goal[]>(`${this.base}/goals`, { params: toParams({ status }) });
  }

  goal(id: string): Observable<GoalDetail> {
    return this.http.get<GoalDetail>(`${this.base}/goals/${id}`);
  }

  createGoal(request: GoalRequest): Observable<Goal> {
    return this.http.post<Goal>(`${this.base}/goals`, request);
  }

  updateGoal(id: string, request: GoalRequest): Observable<Goal> {
    return this.http.put<Goal>(`${this.base}/goals/${id}`, request);
  }

  deleteGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/goals/${id}`);
  }

  addContribution(
    goalId: string,
    amount: number,
    date: string | null,
    note: string | null,
  ): Observable<Goal> {
    return this.http.post<Goal>(`${this.base}/goals/${goalId}/contributions`, {
      amount,
      date,
      note,
    });
  }

  deleteContribution(goalId: string, contributionId: string): Observable<Goal> {
    return this.http.delete<Goal>(`${this.base}/goals/${goalId}/contributions/${contributionId}`);
  }

  // ---- AI
  aiText(
    text: string,
    preview: boolean,
    accountId: string | null = null,
  ): Observable<AiTransactionResult> {
    return this.http.post<AiTransactionResult>(`${this.base}/ai/transactions/text`, {
      text,
      preview,
      accountId,
    });
  }

  aiVoice(
    audio: Blob,
    fileName: string,
    preview: boolean,
    accountId: string | null = null,
  ): Observable<AiTransactionResult> {
    const form = new FormData();
    form.append('audio', audio, fileName);
    form.append('preview', String(preview));
    if (accountId) {
      form.append('accountId', accountId);
    }
    return this.http.post<AiTransactionResult>(`${this.base}/ai/transactions/voice`, form);
  }

  insights(from?: string, to?: string): Observable<FinancialInsights> {
    return this.http.get<FinancialInsights>(`${this.base}/ai/insights`, {
      params: toParams({ from, to }),
    });
  }
}

export type { GoalContribution };
