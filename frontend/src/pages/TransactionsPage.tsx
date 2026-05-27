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
  const [monthFilter, setMonthFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleDelete(transaction: TransactionItem) {
    const confirmed = window.confirm(`Удалить операцию «${transaction.title}»?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(transaction.id);
    setError(null);

    try {
      await api.deleteTransaction(transaction.id);
      await loadTransactions();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'Не удалось удалить операцию';
      setError(message);
    } finally {
      setDeletingId(null);
    }
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
      const matchesMonth = !monthFilter || transaction.transactionDate.slice(0, 7) === monthFilter;
      const matchesDateFrom = !dateFrom || transaction.transactionDate.slice(0, 10) >= dateFrom;
      const matchesDateTo = !dateTo || transaction.transactionDate.slice(0, 10) <= dateTo;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesMonth &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [transactions, search, typeFilter, categoryFilter, monthFilter, dateFrom, dateTo]);

  const incomeCount = transactions.filter((transaction) => transaction.type === 'income').length;
  const expenseCount = transactions.filter((transaction) => transaction.type === 'expense').length;

  return (
    <div className="transactions-layout">
      {error ? <div className="error-banner">{error}</div> : null}
      <section className="panel transaction-toolbar" id="transactions-overview">
        <div className="panel-heading">
          <h3>Журнал финансовых операций</h3>
          <p>
            Здесь объединены ручные операции пользователя и автоматические события, пришедшие из
            интеграций.
          </p>
        </div>

        <nav className="section-jump-nav" aria-label="Навигация по странице операций">
          <a href="#transactions-overview" className="section-jump-nav__link">
            Журнал финансовых операций
          </a>
          <a href="#transaction-form" className="section-jump-nav__link">
            Новая операция
          </a>
          <a href="#transactions-history" className="section-jump-nav__link">
            Все операции
          </a>
        </nav>

        <div className="automation-note">
          <div className="automation-note__item">
            <strong>Наличные операции</strong>
            <span>Пользователь сам добавляет доход или расход через форму, если операция была вне банка.</span>
          </div>
          <div className="automation-note__item">
            <strong>Безналичные операции</strong>
            <span>Операция поступает автоматически из кошелька и сразу попадает в общую аналитику.</span>
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

          <label>
            Месяц
            <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} />
          </label>

          <label>
            Дата от
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </label>

          <label>
            Дата до
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
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
      <div id="transaction-form">
        <TransactionForm onSubmit={handleCreate} />
      </div>
      <TransactionList
        transactions={filteredTransactions}
        title="Все операции"
        description="Полная история с фильтрацией по типу, категории и датам."
        onDelete={handleDelete}
        deletingId={deletingId}
        sectionId="transactions-history"
      />
    </div>
  );
}
