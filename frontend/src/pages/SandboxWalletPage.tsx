import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  IntegrationMeta,
  SandboxWalletPayload,
  SandboxWalletState
} from '../services/api';
import { getCategoryBudgets } from '../services/planning';

const emptyPin = '1234';

export function SandboxWalletPage() {
  const [walletState, setWalletState] = useState<SandboxWalletState | null>(null);
  const [connectForm, setConnectForm] = useState({
    phoneNumber: '+79990000000',
    initialBalance: 120000,
    savingsAllocation: 24000,
    virtualAllocation: 12000,
    pinCode: emptyPin
  });
  const [selectedSavedPhone, setSelectedSavedPhone] = useState<string | null>(null);
  const [form, setForm] = useState<SandboxWalletPayload>({
    accountId: '',
    destinationAccountId: '',
    direction: 'debit',
    amount: 0,
    category: 'Супермаркет',
    title: 'Покупка в магазине',
    note: '',
    occurredAt: new Date().toISOString().slice(0, 16)
  });
  const [scenario, setScenario] = useState<'purchase' | 'transfer' | 'topup' | 'refund'>('purchase');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingBalance, setIsApplyingBalance] = useState(false);
  const [startingBalanceDraft, setStartingBalanceDraft] = useState(120000);
  const [savingsDraft, setSavingsDraft] = useState(24000);
  const [virtualDraft, setVirtualDraft] = useState(12000);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [integrationMeta, setIntegrationMeta] = useState<IntegrationMeta | null>(null);

  async function loadWalletState() {
    const [wallet, meta] = await Promise.all([api.getSandboxWalletState(), api.getIntegrationMeta()]);
    setWalletState(wallet);
    setIntegrationMeta(meta);
  }

  useEffect(() => {
    void loadWalletState().catch(() => null);
  }, []);

  const connectedWallet = walletState?.connected ? walletState.wallet ?? null : null;
  const availableAccounts = walletState?.availableAccounts ?? [];
  const categorySuggestions = useMemo(
    () => Array.from(new Set(getCategoryBudgets().map((budget) => budget.category).filter(Boolean))),
    []
  );

  useEffect(() => {
    if (!connectedWallet) {
      return;
    }

    setStartingBalanceDraft(connectedWallet.initialBalance);
    const savingsAccount = connectedWallet.accounts.find((account) => account.type === 'savings');
    const virtualAccount = connectedWallet.accounts.find((account) => account.type === 'virtual');
    setSavingsDraft(savingsAccount?.initialBalance ?? 0);
    setVirtualDraft(virtualAccount?.initialBalance ?? 0);
  }, [connectedWallet]);

  const connectMainDraft = Math.max(
    connectForm.initialBalance - connectForm.savingsAllocation - connectForm.virtualAllocation,
    0
  );
  const activeMainDraft = Math.max(startingBalanceDraft - savingsDraft - virtualDraft, 0);

  useEffect(() => {
    const presets = {
      purchase: { direction: 'debit', category: 'Супермаркет', title: 'Покупка в магазине' },
      transfer: { direction: 'debit', category: 'Переводы', title: 'Перевод другому человеку' },
      topup: { direction: 'credit', category: 'Пополнения', title: 'Пополнение кошелька' },
      refund: { direction: 'credit', category: 'Возвраты', title: 'Возврат средств' }
    } as const;

    setForm((prev) => ({
      ...prev,
      direction: presets[scenario].direction,
      category: presets[scenario].category,
      title: presets[scenario].title,
      destinationAccountId: scenario === 'transfer' ? prev.destinationAccountId ?? '' : ''
    }));
  }, [scenario]);

  useEffect(() => {
    if (!connectedWallet || form.accountId) {
      return;
    }

    const preferredAccount =
      connectedWallet.accounts.find((account) => account.type === 'main') ?? connectedWallet.accounts[0];

    if (!preferredAccount) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      accountId: preferredAccount.id
    }));
  }, [connectedWallet, form.accountId]);

  const expenseCategories = useMemo(() => {
    if (!connectedWallet) {
      return [];
    }

    const grouped = connectedWallet.operations
      .filter((operation) => operation.direction === 'debit')
      .reduce<Record<string, number>>((acc, operation) => {
        acc[operation.category] = (acc[operation.category] ?? 0) + operation.amount;
        return acc;
      }, {});

    return Object.entries(grouped)
      .map(([name, total]) => ({ name, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 5);
  }, [connectedWallet]);

  const transferDestinationOptions = useMemo(() => {
    if (!connectedWallet) {
      return [];
    }

    return availableAccounts.flatMap((wallet) =>
      wallet.accounts
        .filter((account) => account.id !== form.accountId)
        .map((account) => ({
          accountId: account.id,
          walletId: wallet.walletId,
          phoneNumber: wallet.phoneNumber,
          ownerName: wallet.ownerName,
          title: account.title,
          maskedNumber: account.maskedNumber,
          balance: account.balance,
          type: account.type
        }))
    );
  }, [availableAccounts, connectedWallet, form.accountId]);

  const transferSourceAccounts = useMemo(() => connectedWallet?.accounts ?? [], [connectedWallet]);

  function prepareSavedWalletLogin(phoneNumber: string) {
    setSelectedSavedPhone(phoneNumber);
    setConnectForm((prev) => ({
      ...prev,
      phoneNumber,
      pinCode: ''
    }));
    setMessage(null);
    setError(null);
  }

  function prepareNewWallet() {
    setSelectedSavedPhone(null);
    setConnectForm({
      phoneNumber: '+79990000000',
      initialBalance: 120000,
      savingsAllocation: 24000,
      virtualAllocation: 12000,
      pinCode: emptyPin
    });
    setMessage(null);
    setError(null);
  }

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConnecting(true);
    setError(null);
    setMessage(null);

    try {
      const nextState = await api.connectSandboxWallet(connectForm);
      setWalletState(nextState);
      setSelectedSavedPhone(null);
      setMessage(
        nextState.savedWallets?.some((wallet) => wallet.phoneNumber === connectForm.phoneNumber)
          ? 'Тестовый кошелек подключен. Баланс и история восстановлены по номеру телефона.'
          : 'Тестовый кошелек создан и подключен.'
      );
    } catch (connectError) {
      const text =
        connectError instanceof Error ? connectError.message : 'Не удалось подключить тестовый кошелек';
      setError(text);
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await api.sendSandboxTransaction({
        ...form,
        operationKind: scenario,
        destinationAccountId: scenario === 'transfer' ? form.destinationAccountId : undefined,
        occurredAt: new Date(form.occurredAt).toISOString()
      });
      await loadWalletState();
      setMessage('Операция проведена в тестовом кошельке и автоматически загружена в Финтрек.');
      setForm((prev) => ({
        ...prev,
        amount: 0,
        note: '',
        occurredAt: new Date().toISOString().slice(0, 16),
        destinationAccountId: scenario === 'transfer' ? prev.destinationAccountId : ''
      }));
    } catch (submitError) {
      const text = submitError instanceof Error ? submitError.message : 'Не удалось провести операцию';
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setMessage(null);
    setIsSwitching(true);

    try {
      const nextState = await api.disconnectSandboxWallet();
      setWalletState(nextState);
      setSelectedSavedPhone(null);
      setMessage('Текущий кошелек отключен. Можно выбрать другой сохраненный номер.');
    } catch (disconnectError) {
      const text =
        disconnectError instanceof Error ? disconnectError.message : 'Не удалось отключить кошелек';
      setError(text);
    } finally {
      setIsSwitching(false);
    }
  }

  async function handleResetWallet() {
    const confirmed = window.confirm('Очистить историю операций выбранного кошелька и вернуть исходные балансы счетов?');
    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsResetting(true);

    try {
      const nextState = await api.resetSandboxWallet();
      setWalletState(nextState);
      setMessage('Статистика кошелька очищена, а балансы счетов возвращены к начальному состоянию.');
    } catch (resetError) {
      const text =
        resetError instanceof Error ? resetError.message : 'Не удалось очистить статистику кошелька';
      setError(text);
    } finally {
      setIsResetting(false);
    }
  }

  async function handleApplyInitialBalance() {
    if (!connectedWallet) {
      return;
    }

    const confirmed = window.confirm(
      'Установить новый стартовый баланс для этого кошелька? История операций кошелька и связанные автоматические операции в Финтрек будут очищены.'
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsApplyingBalance(true);

    try {
      const nextState = await api.setSandboxWalletInitialBalance({
        initialBalance: startingBalanceDraft,
        savingsAllocation: savingsDraft,
        virtualAllocation: virtualDraft
      });
      setWalletState(nextState);
      setForm((prev) => ({ ...prev, accountId: '' }));
      setMessage('Стартовый баланс обновлен и заново распределен по счетам тестового кошелька.');
    } catch (applyError) {
      const text =
        applyError instanceof Error ? applyError.message : 'Не удалось обновить стартовый баланс';
      setError(text);
    } finally {
      setIsApplyingBalance(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Тестовый кошелек</span>
          <h2>Демо-банк с сохраненными кошельками, PIN и несколькими счетами</h2>
          <p>
            Пользователь может повторно входить в тестовый кошелек по номеру телефона, выбирать один
            из сохраненных кошельков и управлять несколькими счетами внутри него. Все операции
            автоматически синхронизируются с Финтрек.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--focus">
          <span>Ключевая идея</span>
          <strong>Один номер телефона = один сохраненный демо-кошелек</strong>
          <p>При повторном входе по тому же номеру восстанавливаются баланс, счета и история операций.</p>
        </div>
      </section>

      {message ? <div className="success-banner">{message}</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!connectedWallet ? (
        <>
          <section className="panel">
            <div className="panel-heading">
              <h3>Сохраненные кошельки</h3>
              <p>Если кошелек уже создавался ранее, можно выбрать его и войти по номеру телефона и PIN-коду.</p>
            </div>

            <div className="saved-wallets-grid">
              {walletState?.savedWallets?.length ? (
                walletState.savedWallets.map((wallet) => (
                  <button
                    key={wallet.phoneNumber}
                    type="button"
                    className={
                      selectedSavedPhone === wallet.phoneNumber
                        ? 'saved-wallet-card saved-wallet-card--active'
                        : 'saved-wallet-card'
                    }
                    onClick={() => prepareSavedWalletLogin(wallet.phoneNumber)}
                  >
                    <strong>{wallet.ownerName}</strong>
                    <span>{wallet.phoneNumber}</span>
                    <span>Баланс: {wallet.balance.toLocaleString('ru-RU')} ₽</span>
                    <span>Счетов: {wallet.accountsCount}</span>
                  </button>
                ))
              ) : (
                <div className="empty-state">Пока нет сохраненных тестовых кошельков.</div>
              )}
            </div>
          </section>

          <form className="panel form-panel" onSubmit={handleConnect}>
            <div className="panel-heading">
              <h3>{selectedSavedPhone ? 'Войти в сохраненный кошелек' : 'Создать или подключить кошелек'}</h3>
              <p>
                Для нового кошелька укажи номер телефона, стартовый баланс и 4-значный PIN. Для уже
                созданного кошелька введи тот же номер и корректный PIN.
              </p>
            </div>

            {selectedSavedPhone ? (
              <div className="toolbar-actions">
                <button type="button" className="secondary-button" onClick={prepareNewWallet}>
                  Создать новый кошелек
                </button>
              </div>
            ) : null}

            <div className="form-grid">
              <label>
                Номер телефона кошелька
                <input
                  value={connectForm.phoneNumber}
                  onChange={(event) =>
                    setConnectForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
                  }
                  placeholder="+79990000000"
                  required
                />
              </label>

              <label>
                Стартовый баланс
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={connectForm.initialBalance}
                  onChange={(event) =>
                    setConnectForm((prev) => ({ ...prev, initialBalance: Number(event.target.value) }))
                  }
                  disabled={Boolean(selectedSavedPhone)}
                  required
                />
                {selectedSavedPhone ? (
                  <small className="field-hint">Для сохраненного кошелька стартовый баланс уже зафиксирован.</small>
                ) : (
                  <small className="field-hint">Эта сумма распределится между основным, накопительным и виртуальным счетом.</small>
                )}
              </label>

              <label>
                В накопительный счет
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={connectForm.savingsAllocation}
                  onChange={(event) =>
                    setConnectForm((prev) => ({
                      ...prev,
                      savingsAllocation: Number(event.target.value)
                    }))
                  }
                  disabled={Boolean(selectedSavedPhone)}
                  required
                />
              </label>

              <label>
                В виртуальную карту
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={connectForm.virtualAllocation}
                  onChange={(event) =>
                    setConnectForm((prev) => ({
                      ...prev,
                      virtualAllocation: Number(event.target.value)
                    }))
                  }
                  disabled={Boolean(selectedSavedPhone)}
                  required
                />
                {!selectedSavedPhone ? (
                  <small className="field-hint">
                    На основной счет останется {connectMainDraft.toLocaleString('ru-RU')} ₽.
                  </small>
                ) : null}
              </label>

              <label>
                PIN-код кошелька
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={connectForm.pinCode}
                  onChange={(event) =>
                    setConnectForm((prev) => ({ ...prev, pinCode: event.target.value }))
                  }
                  placeholder="4 цифры"
                  required
                />
              </label>
            </div>

            <button className="primary-button" type="submit" disabled={isConnecting}>
              {isConnecting ? 'Подключаем...' : selectedSavedPhone ? 'Войти в кошелек' : 'Создать кошелек'}
            </button>
          </form>
        </>
      ) : (
        <>
          <section className="panel wallet-showcase">
            <div className="wallet-showcase__card">
              <div className="wallet-showcase__header">
                <div className="wallet-showcase__brand">
                  <img src="/fintrack-logo.svg" alt="Логотип Финтрек" className="wallet-showcase__logo" />
                  <div>
                    <strong>FinTrack Wallet</strong>
                    <span>Demo Banking Layer</span>
                  </div>
                </div>
                <span className="wallet-showcase__chip">● ● ●</span>
              </div>

              <div className="wallet-showcase__balance">
                <span>Общий остаток по кошельку</span>
                <strong>{connectedWallet.balance.toLocaleString('ru-RU')} ₽</strong>
              </div>

              <div className="wallet-showcase__footer">
                <div>
                  <span>Владелец</span>
                  <strong>{connectedWallet.ownerName}</strong>
                </div>
                <div>
                  <span>Номер кошелька</span>
                  <strong>{connectedWallet.phoneNumber}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stats-card stats-card--slate wallet-card">
              <span>Активный демо-кошелек</span>
              <strong>•••• {connectedWallet.phoneNumber.slice(-4)}</strong>
              <p>{connectedWallet.ownerName}</p>
            </div>
            <div className="stats-card stats-card--slate">
              <span>Общий баланс кошелька</span>
              <strong>{connectedWallet.balance.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="stats-card stats-card--emerald">
              <span>Всего зачислений</span>
              <strong>{connectedWallet.totalCredits.toLocaleString('ru-RU')} ₽</strong>
            </div>
            <div className="stats-card stats-card--rose">
              <span>Всего списаний</span>
              <strong>{connectedWallet.totalDebits.toLocaleString('ru-RU')} ₽</strong>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <h3>Управление кошельком</h3>
              <p>Можно выйти из текущего кошелька, выбрать другой сохраненный номер или сбросить статистику этого кошелька.</p>
            </div>

            <div className="form-grid">
              <label>
                Стартовый баланс кошелька
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={startingBalanceDraft}
                  onChange={(event) => setStartingBalanceDraft(Number(event.target.value))}
                />
                <small className="field-hint">
                  Если кошелек был создан с нулем или нужно переопределить стартовую сумму, установи ее здесь.
                </small>
              </label>

              <label>
                В накопительный счет
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={savingsDraft}
                  onChange={(event) => setSavingsDraft(Number(event.target.value))}
                />
              </label>

              <label>
                В виртуальную карту
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={virtualDraft}
                  onChange={(event) => setVirtualDraft(Number(event.target.value))}
                />
                <small className="field-hint">
                  После распределения на основной счет останется {activeMainDraft.toLocaleString('ru-RU')} ₽.
                </small>
              </label>
            </div>

            <div className="toolbar-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={handleApplyInitialBalance}
                disabled={isApplyingBalance}
              >
                {isApplyingBalance ? 'Обновляем баланс...' : 'Установить стартовый баланс'}
              </button>
              <button type="button" className="secondary-button" onClick={handleDisconnect} disabled={isSwitching}>
                {isSwitching ? 'Отключаем...' : 'Сменить кошелек'}
              </button>
              <button type="button" className="danger-button" onClick={handleResetWallet} disabled={isResetting}>
                {isResetting ? 'Очищаем...' : 'Стереть статистику кошелька'}
              </button>
            </div>
          </section>

          <section className="dashboard-columns">
            <div className="panel">
              <div className="panel-heading">
                <h3>Счета внутри кошелька</h3>
                <p>Основной, накопительный и виртуальный счет с отдельными остатками.</p>
              </div>

              <div className="saved-wallets-grid">
                {connectedWallet.accounts.map((account) => (
                  <div className={form.accountId === account.id ? 'saved-wallet-card saved-wallet-card--active' : 'saved-wallet-card'} key={account.id}>
                    <strong>{account.title}</strong>
                    <span>{account.maskedNumber}</span>
                    <span>Текущий баланс: {account.balance.toLocaleString('ru-RU')} ₽</span>
                    <span>Стартовый баланс: {account.initialBalance.toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
              </div>
            </div>

            <form className="panel form-panel" onSubmit={handleSubmit}>
              <div className="panel-heading">
                <h3>Операция по счету</h3>
                <p>Выбери сценарий, конкретный счет и проведи операцию. После этого она автоматически попадет в Финтрек.</p>
              </div>

              {scenario === 'transfer' ? (
                <div className="banking-transfer-layout">
                  <div className="panel-heading">
                    <h3>Счет отправителя</h3>
                    <p>Выберите счет, с которого будут списаны средства.</p>
                  </div>
                  <div className="saved-wallets-grid">
                    {transferSourceAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        className={form.accountId === account.id ? 'saved-wallet-card saved-wallet-card--active' : 'saved-wallet-card'}
                        onClick={() => setForm((prev) => ({ ...prev, accountId: account.id }))}
                      >
                        <strong>{account.title}</strong>
                        <span>{account.maskedNumber}</span>
                        <span>Баланс: {account.balance.toLocaleString('ru-RU')} ₽</span>
                      </button>
                    ))}
                  </div>

                  <div className="panel-heading">
                    <h3>Счет получателя</h3>
                    <p>Можно перевести средства на свой другой счет или в другой сохраненный кошелек по номеру.</p>
                  </div>
                  <div className="saved-wallets-grid">
                    {transferDestinationOptions.map((account) => (
                      <button
                        key={account.accountId}
                        type="button"
                        className={form.destinationAccountId === account.accountId ? 'saved-wallet-card saved-wallet-card--active' : 'saved-wallet-card'}
                        onClick={() => setForm((prev) => ({ ...prev, destinationAccountId: account.accountId }))}
                      >
                        <strong>{account.title}</strong>
                        <span>{account.maskedNumber}</span>
                        <span>{account.phoneNumber}</span>
                        <span>Баланс: {account.balance.toLocaleString('ru-RU')} ₽</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="form-grid">
                <label>
                  Сценарий операции
                  <select value={scenario} onChange={(event) => setScenario(event.target.value as typeof scenario)}>
                    <option value="purchase">Покупка</option>
                    <option value="transfer">Перевод между счетами</option>
                    <option value="topup">Пополнение</option>
                    <option value="refund">Возврат</option>
                  </select>
                </label>

                <label>
                  Счет / карта
                  <select
                    value={form.accountId}
                    onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}
                  >
                    {connectedWallet.accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.title} • {account.maskedNumber}
                      </option>
                    ))}
                  </select>
                </label>

                {scenario === 'transfer' ? (
                  <label>
                    Куда перевести
                    <select
                      value={form.destinationAccountId ?? ''}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, destinationAccountId: event.target.value }))
                      }
                      required
                    >
                      <option value="" disabled>
                        Выбери счет назначения
                      </option>
                      {transferDestinationOptions.map((account) => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.title} • {account.maskedNumber} • {account.phoneNumber}
                        </option>
                      ))}
                    </select>
                    <small className="field-hint">
                      Можно перевести средства между своими счетами или на другой сохраненный кошелек по его номеру.
                    </small>
                  </label>
                ) : null}

                <label>
                  Тип операции
                  <select
                    value={form.direction}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        direction: event.target.value as SandboxWalletPayload['direction']
                      }))
                    }
                  >
                    <option value="debit">Списание</option>
                    <option value="credit">Зачисление</option>
                  </select>
                </label>

                <label>
                  Сумма
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount || ''}
                    onChange={(event) => setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
                    required
                  />
                </label>

                <label>
                  Категория
                  <input
                    list="budget-category-options"
                    value={form.category}
                    onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                    required
                  />
                  <small className="field-hint">
                    Можно выбрать категорию из бюджетов или ввести свою вручную.
                  </small>
                </label>

                <label>
                  Заголовок
                  <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
                </label>

                <label>
                  Дата и время
                  <input
                    type="datetime-local"
                    value={form.occurredAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                    required
                  />
                </label>
              </div>

              <label>
                Комментарий
                <textarea
                  rows={4}
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Например, покупка в магазине или перевод между счетами"
                />
              </label>

              <button className="primary-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Проводим операцию...' : 'Провести операцию'}
              </button>

              <datalist id="budget-category-options">
                {categorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </form>
          </section>

          <section className="dashboard-columns">
            <div className="panel">
              <div className="panel-heading">
                <h3>История операций кошелька</h3>
                <p>Все последние операции мини-банка с указанием счета и общего баланса после операции.</p>
              </div>

              <div className="wallet-operation-list">
                {connectedWallet.operations.length ? (
                  connectedWallet.operations.map((operation) => (
                    <article className="wallet-operation-card" key={operation.id}>
                      <div>
                        <strong>{operation.title}</strong>
                        <span>{operation.accountTitle ?? 'Архивный счет'} • {operation.category}</span>
                        <span>{new Date(operation.occurredAt).toLocaleString('ru-RU')}</span>
                        <span>{operation.note ?? 'Интеграционное событие тестового кошелька'}</span>
                      </div>

                      <div className="transaction-meta">
                        <span className={operation.direction === 'credit' ? 'badge badge--income' : 'badge badge--expense'}>
                          {operation.direction === 'credit' ? 'Зачисление' : 'Списание'}
                        </span>
                        <strong>{operation.amount.toLocaleString('ru-RU')} ₽</strong>
                        <span>Баланс кошелька после операции: {operation.balanceAfter.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">Пока нет операций в тестовом кошельке.</div>
                )}
              </div>
            </div>

            <section className="panel integration-meta">
              <div className="panel-heading">
                <h3>Интеграционный контур</h3>
                <p>Как кошелек с несколькими счетами связан с основной платформой Финтрек.</p>
              </div>

              <div className="integration-meta__card">
                <strong>Повторный вход по номеру телефона</strong>
                <span>Если номер и PIN совпадают, система восстанавливает тот же кошелек, его счета и историю операций.</span>
              </div>

              <div className="integration-meta__card">
                <strong>Пример webhook-адреса</strong>
                <span>{integrationMeta?.note ?? 'Адрес внешней интеграции загружается...'}</span>
                {integrationMeta ? <div className="integration-url">{integrationMeta.exampleWebhookUrl}</div> : null}
              </div>

              <div className="integration-meta__card">
                <strong>Крупные категории списаний</strong>
                <span>Агрегация расходов внутри активного кошелька.</span>
                <div className="wallet-category-list">
                  {expenseCategories.length ? (
                    expenseCategories.map((category) => (
                      <div className="wallet-category-pill" key={category.name}>
                        <span>{category.name}</span>
                        <strong>{category.total.toLocaleString('ru-RU')} ₽</strong>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">После первых списаний здесь появятся категории.</div>
                  )}
                </div>
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}
