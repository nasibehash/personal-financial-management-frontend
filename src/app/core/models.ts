// Shapes of the Personal Financial Management API (see the backend README).

export type TransactionType = 'Income' | 'Expense' | 'Transfer';
export type CategoryType = 'Income' | 'Expense';
export type AccountType = 'Cash' | 'BankAccount' | 'Card' | 'Savings' | 'DigitalWallet' | 'Other';
export type GoalStatus = 'Active' | 'Completed' | 'Cancelled';
export type TransactionSource = 'Manual' | 'Text' | 'Voice';

export const ACCOUNT_TYPES: AccountType[] = [
  'Cash',
  'BankAccount',
  'Card',
  'Savings',
  'DigitalWallet',
  'Other',
];

export interface User {
  id: string;
  fullName: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  balance: number;
  isArchived: boolean;
}

export interface AccountRequest {
  name: string;
  type: AccountType;
  initialBalance: number;
  isArchived?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  accountId: string;
  accountName: string;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  source: TransactionSource;
}

export interface TransactionRequest {
  type: TransactionType;
  amount: number;
  accountId: string;
  categoryId?: string | null;
  destinationAccountId?: string | null;
  date?: string | null;
  description?: string | null;
}

export interface TransactionFilter {
  from?: string;
  to?: string;
  type?: TransactionType | '';
  accountId?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface FinancialSummary {
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  savingsRate: number | null;
  transactionCount: number;
  averageDailyExpense: number;
  totalBalance: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  from: string;
  to: string;
  type: CategoryType;
  total: number;
  categories: CategorySpending[];
}

export interface PeriodTotals {
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

export interface PeriodComparison {
  current: PeriodTotals;
  previous: PeriodTotals;
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
}

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  startDate: string;
  deadline: string | null;
  daysLeft: number | null;
  requiredMonthlySaving: number | null;
  isOverdue: boolean;
  status: GoalStatus;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  note: string | null;
}

export interface GoalDetail {
  goal: Goal;
  contributions: GoalContribution[];
}

export interface GoalRequest {
  name: string;
  targetAmount: number;
  deadline?: string | null;
  description?: string | null;
  isCancelled?: boolean;
}

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  date: string;
  description: string | null;
  accountId: string | null;
  accountName: string | null;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  method: 'ai' | 'rules';
}

export interface AiTransactionResult {
  transcript: string | null;
  draft: ParsedTransaction;
  transaction: Transaction | null;
}

export interface FinancialInsights {
  from: string;
  to: string;
  insights: string[];
  generatedByAi: boolean;
}
