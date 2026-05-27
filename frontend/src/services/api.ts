import { clearSession, getStoredSession } from './auth';

function getApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  return '/api';
}

const API_URL = getApiUrl();
const CACHE_PREFIX = 'fintrack_cache_';
const PENDING_TRANSACTIONS_KEY = 'fintrack_pending_transactions';

interface ApiErrorPayload {
  message?: string | string[];
}

interface PendingTransactionRecord {
  localId: string;
  payload: TransactionPayload;
  queuedAt: string;
}

const DEFAULT_INTEGRATION_META: IntegrationMeta = {
  externalBaseUrl: null,
  isPubliclyReachableConfigured: false,
  webhookPath: '/api/webhooks/sandbox-wallet',
  exampleWebhookUrl: '/api/webhooks/sandbox-wallet',
  note: 'Интеграционные метаданные временно недоступны. При восстановлении сети данные будут обновлены.'
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const session = getStoredSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...options?.headers
    }
  });

  if (response.status === 401) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const message = Array.isArray(errorPayload?.message)
      ? errorPayload.message[0]
      : errorPayload?.message ?? 'Сессия истекла. Войдите в аккаунт заново.';

    const isAuthRequest = path.startsWith('/auth/');
    if (!isAuthRequest) {
      clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }

    throw new Error(message);
  }

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const message = Array.isArray(errorPayload?.message)
      ? errorPayload.message[0]
      : errorPayload?.message ?? 'Произошла ошибка запроса';
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function getCacheKey(path: string) {
  return `${CACHE_PREFIX}${path}`;
}

function invalidateCacheByPrefix(prefix: string) {
  const keysToDelete: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(`${CACHE_PREFIX}${prefix}`)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => localStorage.removeItem(key));
}

function invalidateFinanceCaches() {
  invalidateCacheByPrefix('/transactions');
  invalidateCacheByPrefix('/dashboard/summary');
  invalidateCacheByPrefix('/forecast');
}

function setCachedValue<T>(path: string, data: T) {
  localStorage.setItem(
    getCacheKey(path),
    JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    })
  );
}

function getCachedValue<T>(path: string): T | null {
  const raw = localStorage.getItem(getCacheKey(path));
  if (!raw) {
    return null;
  }

  try {
    return (JSON.parse(raw) as { data: T }).data;
  } catch {
    return null;
  }
}

function getPendingTransactions(): PendingTransactionRecord[] {
  const raw = localStorage.getItem(PENDING_TRANSACTIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as PendingTransactionRecord[];
  } catch {
    return [];
  }
}

function setPendingTransactions(items: PendingTransactionRecord[]) {
  localStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(items));
}

function removePendingTransaction(localId: string) {
  const nextItems = getPendingTransactions().filter((item) => item.localId !== localId);
  setPendingTransactions(nextItems);
}

function toOfflineTransaction(record: PendingTransactionRecord): TransactionItem {
  return {
    id: record.localId,
    title: record.payload.title,
    type: record.payload.type,
    amount: String(record.payload.amount.toFixed(2)),
    category: record.payload.category,
    note: record.payload.note ?? null,
    createdAt: record.queuedAt,
    transactionDate: record.payload.transactionDate,
    source: 'manual',
    provider: null
  };
}

export interface AuthPayload {
  fullName?: string;
  email: string;
  password: string;
}

export interface TransactionPayload {
  title: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  transactionDate: string;
}

export interface TransactionItem {
  id: string;
  title: string;
  type: 'income' | 'expense';
  amount: string;
  category: string;
  note: string | null;
  createdAt: string;
  transactionDate: string;
  source: 'manual' | 'webhook';
  provider: string | null;
}

export interface DashboardSummary {
  balance: number;
  overallBalance: number;
  mainAccountBalance: number;
  walletBalance: number | null;
  totalIncome: number;
  totalExpense: number;
  categories: Array<{ name: string; total: number }>;
  incomeCategories: Array<{ name: string; total: number }>;
  expenseCategories: Array<{ name: string; total: number }>;
  periodMonth: string;
  recentTransactions: TransactionItem[];
}

export interface ForecastSummary {
  currentBalance: number;
  currentMonth: string;
  monthsAnalyzed: string[];
  averageIncome: number;
  averageExpense: number;
  forecastIncome: number;
  forecastExpense: number;
  forecastBalance: number;
  safeSpendLimit: number;
  reserveTarget: number;
  healthScore: number;
  topExpenseCategories: Array<{ name: string; total: number }>;
  recommendations: string[];
}

export interface SandboxWalletPayload {
  accountId: string;
  destinationAccountId?: string;
  operationKind?: 'purchase' | 'topup' | 'transfer' | 'refund';
  direction: 'credit' | 'debit';
  amount: number;
  category: string;
  title: string;
  note?: string;
  occurredAt: string;
}

export interface SandboxWalletDistributionPayload {
  initialBalance: number;
  savingsAllocation?: number;
  virtualAllocation?: number;
}

export interface SandboxWalletState {
  connected: boolean;
  savedWallets?: Array<{
    phoneNumber: string;
    ownerName: string;
    balance: number;
    accountsCount: number;
  }>;
  wallet?: {
    phoneNumber: string;
    ownerName: string;
    balance: number;
    initialBalance: number;
    totalCredits: number;
    totalDebits: number;
    accounts: Array<{
      id: string;
      type: 'main' | 'savings' | 'virtual';
      title: string;
      maskedNumber: string;
      balance: number;
      initialBalance: number;
    }>;
    operations: Array<{
      id: string;
      accountId: string | null;
      accountTitle: string | null;
      title: string;
      category: string;
      direction: 'credit' | 'debit';
      operationKind: 'purchase' | 'topup' | 'transfer' | 'refund';
      amount: number;
      note: string | null;
      occurredAt: string;
      balanceAfter: number;
    }>;
  };
  availableAccounts?: Array<{
    walletId: string;
    phoneNumber: string;
    ownerName: string;
    balance: number;
    accounts: Array<{
      id: string;
      type: 'main' | 'savings' | 'virtual';
      title: string;
      maskedNumber: string;
      balance: number;
    }>;
  }>;
}

export interface IntegrationMeta {
  externalBaseUrl: string | null;
  isPubliclyReachableConfigured: boolean;
  webhookPath: string;
  exampleWebhookUrl: string;
  note: string;
}

export interface AdminUsersSummary {
  totalUsers: number;
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    transactionsCount: number;
    lastTransactionDate: string | null;
    passwordStatus: string;
  }>;
}

async function requestWithCache<T>(path: string, fallback?: T): Promise<T> {
  const cached = getCachedValue<T>(path);

  if (!navigator.onLine) {
    if (cached) {
      return cached;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error('Нет подключения к сети, а данные еще не были сохранены на устройстве.');
  }

  try {
    const data = await request<T>(path);
    setCachedValue(path, data);
    return data;
  } catch (error) {
    if (cached) {
      return cached;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}

export async function syncPendingTransactions() {
  if (!navigator.onLine) {
    return 0;
  }

  const pending = getPendingTransactions();
  if (!pending.length) {
    return 0;
  }

  const syncedIds: string[] = [];

  for (const item of pending) {
    try {
      await request<TransactionItem>('/transactions', {
        method: 'POST',
        body: JSON.stringify(item.payload)
      });
      syncedIds.push(item.localId);
    } catch {
      break;
    }
  }

  if (syncedIds.length) {
    setPendingTransactions(pending.filter((item) => !syncedIds.includes(item.localId)));
  }

  return syncedIds.length;
}

export function getPendingTransactionsCount() {
  return getPendingTransactions().length;
}

export function clearPendingTransactions() {
  setPendingTransactions([]);
}

export const api = {
  register(payload: Required<AuthPayload>) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  login(payload: AuthPayload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getSummary(month: string) {
    return requestWithCache<DashboardSummary>(`/dashboard/summary?month=${month}`);
  },
  async getTransactions() {
    const remote = await requestWithCache<TransactionItem[]>('/transactions', []);
    const pending = getPendingTransactions().map(toOfflineTransaction);
    return [...pending, ...remote].sort((left, right) =>
      right.transactionDate.localeCompare(left.transactionDate)
    );
  },
  async deleteTransaction(transactionId: string) {
    if (transactionId.startsWith('offline-')) {
      removePendingTransaction(transactionId);
      invalidateFinanceCaches();
      return { deleted: 1 };
    }

    invalidateFinanceCaches();
    return request<{ deleted: number }>(`/transactions/${transactionId}`, {
      method: 'DELETE'
    });
  },
  resetTransactions() {
    invalidateFinanceCaches();
    return request<{ deleted: number }>('/transactions/reset', {
      method: 'DELETE'
    });
  },
  getForecast() {
    return requestWithCache<ForecastSummary>('/forecast');
  },
  getSandboxWalletState() {
    return request<SandboxWalletState>('/sandbox-wallet/state');
  },
  connectSandboxWallet(
    payload: {
      phoneNumber: string;
      initialBalance?: number;
      pinCode: string;
      savingsAllocation?: number;
      virtualAllocation?: number;
    }
  ) {
    return request<SandboxWalletState>('/sandbox-wallet/connect', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  disconnectSandboxWallet() {
    return request<{ connected: false }>('/sandbox-wallet/disconnect', {
      method: 'DELETE'
    });
  },
  resetSandboxWallet() {
    invalidateFinanceCaches();
    return request<SandboxWalletState>('/sandbox-wallet/reset', {
      method: 'DELETE'
    });
  },
  setSandboxWalletInitialBalance(payload: SandboxWalletDistributionPayload) {
    invalidateFinanceCaches();
    return request<SandboxWalletState>('/sandbox-wallet/set-balance', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getAdminUsersSummary() {
    return request<AdminUsersSummary>('/users/admin-summary');
  },
  getIntegrationMeta() {
    return requestWithCache<IntegrationMeta>('/webhooks/meta', DEFAULT_INTEGRATION_META);
  },
  sendSandboxTransaction(payload: SandboxWalletPayload) {
    invalidateFinanceCaches();
    return request('/sandbox-wallet/send', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async createTransaction(payload: TransactionPayload) {
    if (!navigator.onLine) {
      const queuedAt = new Date().toISOString();
      const record: PendingTransactionRecord = {
        localId: `offline-${Date.now()}`,
        payload,
        queuedAt
      };
      setPendingTransactions([record, ...getPendingTransactions()]);
      return toOfflineTransaction(record);
    }

    invalidateFinanceCaches();
    return request<TransactionItem>('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
