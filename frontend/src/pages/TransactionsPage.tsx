import { useEffect, useMemo, useState } from 'react';
import { TransactionForm } from '../components/TransactionForm';
import { TransactionList } from '../components/TransactionList';
import {
  api,
  clearPendingTransactions,
  getPendingTransactionsCount,
  TransactionItem,
  TransactionPayload
} from '../services/api';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isResetting, setIsResetting] = useState(false);

  async function loadTransactions() {
    try {
      setTransactions(await api.getTransactions());
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Не удалось загрузить операции';
      setError(message);
    }
  }

  useEffect(() => {
    void loadTransactions();
  }, []);

  async function handleCreate(payload: TransactionPayload) {
    await api.createTransaction(payload);
    await loadTransactions();
  }

  async function handleReset() {
    const confirmed = window.confirm(
      'Это действие удалит все операции, очистит аналитику и сбросит текущую финансовую статистику. Продолжить?'
    );

    if (!confirmed) {
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      await api.resetTransactions();
      clearPendingTransactions();
      await loadTransactions();
    } catch (resetError) {
      const message =
        resetError instanceof Error ? resetError.message : 'Не удалось очистить статистику';
      setError(message);
    } finally {
      setIsResetting(false);
    }
  }

  const categories = useMemo(
    () => ['all', ...new Set(transactions.map((transaction) => transaction.category))],
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.title.toLowerCase().includes(search.toLowerCase()) ||
        transaction.category.toLowerCase().includes(search.toLowerCase()) ||
        (transaction.note ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesCategory =
        categoryFilter === 'all' || transaction.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, search, typeFilter, categoryFilter]);

  const incomeCount = transactions.filter((transaction) => transaction.type === 'income').length;
  const expenseCount = transactions.filter((transaction) => transaction.type === 'expense').length;

  return (
    <div className="transactions-layout">
      {error ? <div className="error-banner">{error}</div> : null}
      <section className="panel transaction-toolbar">
        <div className="panel-heading">
          <h3>Журнал финансовых операций</h3>
          <p>
            Здесь объединены ручные операции пользователя и автоматические события, пришедшие из
            интеграций.
          </p>
        </div>

        <div className="automation-note">
          <div className="automation-note__item">
            <strong>Ручной ввод</strong>
            <span>Пользователь сам добавляет доход или расход через форму.</span>
          </div>
          <div className="automation-note__item">
            <strong>Автоматический импорт</strong>
            <span>Операция поступает через webhook или тестовый кошелек как событие внешней системы.</span>
          </div>
        </div>

        <div className="toolbar-grid">
          <label>
            Поиск
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Название, категория или заметка"
            />
          </label>

          <label>
            Тип операции
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'all' | 'income' | 'expense')}
            >
              <option value="all">Все</option>
              <option value="income">Доходы</option>
              <option value="expense">Расходы</option>
            </select>
          </label>

          <label>
            Категория
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'Все категории' : category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="toolbar-pills">
          <div className="toolbar-pill">
            <span>Всего записей</span>
            <strong>{transactions.length}</strong>
          </div>
          <div className="toolbar-pill">
            <span>Доходов</span>
            <strong>{incomeCount}</strong>
          </div>
          <div className="toolbar-pill">
            <span>Расходов</span>
            <strong>{expenseCount}</strong>
          </div>
          <div className="toolbar-pill">
            <span>После фильтрации</span>
            <strong>{filteredTransactions.length}</strong>
          </div>
          <div className="toolbar-pill">
            <span>Оффлайн в очереди</span>
            <strong>{getPendingTransactionsCount()}</strong>
          </div>
        </div>

        <div className="toolbar-actions">
          <button
            type="button"
            className="danger-button"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Очищаем...' : 'Полностью очистить статистику'}
          </button>
        </div>
      </section>
      <TransactionForm onSubmit={handleCreate} />
      <TransactionList
        transactions={filteredTransactions}
        title="Отфильтрованные операции"
        description="Живая выборка по поиску, типу операции и категории."
      />
    </div>
  );
}
