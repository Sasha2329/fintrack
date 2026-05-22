import { useEffect, useMemo, useState } from 'react';
import { api, SandboxWalletState } from '../services/api';

type FilterKind = 'all' | 'purchase' | 'topup' | 'transfer' | 'refund';

const filterLabels: Record<FilterKind, string> = {
  all: 'Все',
  purchase: 'Покупки',
  topup: 'Пополнения',
  transfer: 'Переводы',
  refund: 'Возвраты'
};

export function WalletHistoryPage() {
  const [walletState, setWalletState] = useState<SandboxWalletState | null>(null);
  const [filter, setFilter] = useState<FilterKind>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSandboxWalletState().then(setWalletState).catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  const connectedWallet = walletState?.wallet;

  const filteredOperations = useMemo(() => {
    if (!connectedWallet) {
      return [];
    }

    return connectedWallet.operations.filter((operation) =>
      filter === 'all' ? true : operation.operationKind === filter
    );
  }, [connectedWallet, filter]);

  const mainAccount = connectedWallet?.accounts.find((account) => account.type === 'main') ?? null;

  const mainAccountSeries = useMemo(() => {
    if (!connectedWallet || !mainAccount) {
      return [];
    }

    const source = [...connectedWallet.operations]
      .filter((operation) => operation.accountId === mainAccount.id)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));

    if (!source.length) {
      return [{ label: 'Старт', value: mainAccount.initialBalance }];
    }

    return source.map((operation) => ({
      label: new Date(operation.occurredAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit'
      }),
      value: operation.balanceAfter
    }));
  }, [connectedWallet, mainAccount]);

  const chartPoints = useMemo(() => {
    if (mainAccountSeries.length < 2) {
      return '';
    }

    const max = Math.max(...mainAccountSeries.map((item) => item.value), 1);
    const min = Math.min(...mainAccountSeries.map((item) => item.value), 0);
    const range = Math.max(max - min, 1);

    return mainAccountSeries
      .map((point, index) => {
        const x = (index / (mainAccountSeries.length - 1)) * 100;
        const y = 100 - ((point.value - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(' ');
  }, [mainAccountSeries]);

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (!walletState) {
    return <div className="panel">Загрузка истории кошелька...</div>;
  }

  if (!connectedWallet) {
    return <div className="panel">Сначала подключите тестовый кошелек, чтобы увидеть историю.</div>;
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">История кошелька</span>
          <h2>Переводы, покупки, пополнения и движение основного счета</h2>
          <p>
            Здесь собрана банковая история активного тестового кошелька с фильтрами по типам
            операций и отдельным графиком движения основного счета.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--focus">
          <span>Активный кошелек</span>
          <strong>{connectedWallet.phoneNumber}</strong>
          <p>{connectedWallet.ownerName}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Фильтр истории</h3>
          <p>Можно быстро переключаться между покупками, пополнениями, переводами и возвратами.</p>
        </div>

        <div className="range-switch">
          {(Object.keys(filterLabels) as FilterKind[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'range-switch__button active' : 'range-switch__button'}
              onClick={() => setFilter(item)}
            >
              {filterLabels[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="panel line-chart">
        <div className="panel-heading">
          <h3>График движения основного счета</h3>
          <p>Динамика остатка по основному счету после каждой операции.</p>
        </div>

        {mainAccountSeries.length > 1 ? (
          <>
            <svg className="line-chart__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline className="line-chart__path" points={chartPoints} />
            </svg>
            <div className="line-chart__labels">
              {mainAccountSeries.map((point, index) => (
                <span key={`${point.label}-${index}`}>{point.label}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">После первых операций по основному счету появится график движения.</div>
        )}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>История операций кошелька</h3>
          <p>Полная история с фильтрацией по банковым типам операций.</p>
        </div>

        <div className="wallet-operation-list">
          {filteredOperations.length ? (
            filteredOperations.map((operation) => (
              <article className="wallet-operation-card" key={operation.id}>
                <div>
                  <strong>{operation.title}</strong>
                  <span>{operation.accountTitle ?? 'Архивный счет'} • {operation.category}</span>
                  <span>{new Date(operation.occurredAt).toLocaleString('ru-RU')}</span>
                  <span>{operation.note ?? 'Операция без комментария'}</span>
                </div>

                <div className="transaction-meta">
                  <span className="badge badge--manual">{filterLabels[operation.operationKind]}</span>
                  <strong>{operation.amount.toLocaleString('ru-RU')} ₽</strong>
                  <span>Баланс после операции: {operation.balanceAfter.toLocaleString('ru-RU')} ₽</span>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">Для выбранного фильтра пока нет операций.</div>
          )}
        </div>
      </section>
    </div>
  );
}
