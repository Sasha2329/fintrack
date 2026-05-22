export interface CategoryBudget {
  id: string;
  category: string;
  limit: number;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

const BUDGETS_KEY = 'fintrack_category_budgets';
const GOALS_KEY = 'fintrack_financial_goals';

const defaultBudgets: CategoryBudget[] = [
  { id: 'budget-products', category: 'Продукты', limit: 25000 },
  { id: 'budget-transport', category: 'Транспорт', limit: 8000 },
  { id: 'budget-entertainment', category: 'Развлечения', limit: 12000 }
];

const defaultGoals: FinancialGoal[] = [
  {
    id: 'goal-laptop',
    title: 'Ноутбук',
    targetAmount: 120000,
    currentAmount: 35000,
    deadline: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10)
  },
  {
    id: 'goal-trip',
    title: 'Отпуск',
    targetAmount: 90000,
    currentAmount: 20000,
    deadline: new Date(new Date().getFullYear(), 8, 1).toISOString().slice(0, 10)
  },
  {
    id: 'goal-reserve',
    title: 'Подушка безопасности',
    targetAmount: 250000,
    currentAmount: 50000,
    deadline: new Date(new Date().getFullYear() + 1, 2, 1).toISOString().slice(0, 10)
  }
];

function parseStoredValue<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getCategoryBudgets() {
  return parseStoredValue<CategoryBudget[]>(BUDGETS_KEY, defaultBudgets);
}

export function saveCategoryBudgets(items: CategoryBudget[]) {
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(items));
}

export function getFinancialGoals() {
  return parseStoredValue<FinancialGoal[]>(GOALS_KEY, defaultGoals);
}

export function saveFinancialGoals(items: FinancialGoal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(items));
}
