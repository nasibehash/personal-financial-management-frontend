import { AccountType, GoalStatus, TransactionSource, TransactionType } from '../core/models';

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  Income: 'درآمد',
  Expense: 'هزینه',
  Transfer: 'انتقال',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  Cash: 'نقد',
  BankAccount: 'حساب بانکی',
  Card: 'کارت',
  Savings: 'پس‌انداز',
  DigitalWallet: 'کیف پول دیجیتال',
  Other: 'سایر',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  Active: 'در حال انجام',
  Completed: 'تکمیل‌شده',
  Cancelled: 'لغوشده',
};

export const SOURCE_LABELS: Record<TransactionSource, string> = {
  Manual: 'دستی',
  Text: 'با متن',
  Voice: 'با صدا',
};
