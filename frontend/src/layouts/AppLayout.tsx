import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getStoredSession } from '../services/auth';
import { getPendingTransactionsCount, syncPendingTransactions } from '../services/api';
import { BeforeInstallPromptEvent, canShowIosInstallHint, isStandaloneMode } from '../services/pwa';

export function AppLayout() {
  const session = getStoredSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getPendingTransactionsCount());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode());
  const [showIosHint, setShowIosHint] = useState(canShowIosInstallHint());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigation = [
    { to: '/', label: 'Дашборд' },
    { to: '/analytics', label: 'Аналитика' },
    { to: '/budgets', label: 'Бюджеты' },
    { to: '/forecast', label: 'Прогноз' },
    { to: '/goals', label: 'Цели' },
    { to: '/integrations', label: 'Интеграции' },
    { to: '/notifications', label: 'Уведомления' },
    { to: '/reports', label: 'Отчеты' },
    ...(session?.user.role === 'admin' ? [{ to: '/admin/users', label: 'Пользователи' }] : []),
    { to: '/sandbox-wallet', label: 'Тестовый кошелек' },
    { to: '/sandbox-wallet/history', label: 'История кошелька' },
    { to: '/transactions', label: 'Операции' }
  ];
  const currentPageLabel =
    navigation.find((item) => item.to === location.pathname)?.label ?? 'Финтрек';

  useEffect(() => {
    const refreshStatus = () => {
      setIsOnline(navigator.onLine);
      setPendingCount(getPendingTransactionsCount());
    };

    const handleOnline = async () => {
      refreshStatus();
      await syncPendingTransactions();
      refreshStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', refreshStatus);
    const interval = window.setInterval(refreshStatus, 1500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', refreshStatus);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowIosHint(false);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      const installed = isStandaloneMode();
      setIsInstalled(installed);
      setShowIosHint(canShowIosInstallHint());
      if (installed) {
        setInstallPrompt(null);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  function handleLogout() {
    clearSession();
    navigate('/auth');
  }

  async function handleManualSync() {
    await syncPendingTransactions();
    setPendingCount(getPendingTransactionsCount());
    setIsOnline(navigator.onLine);
  }

  async function handleInstallApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  }

  return (
    <div className="app-shell">
      <button
        type="button"
        className={isMobileMenuOpen ? 'mobile-backdrop mobile-backdrop--visible' : 'mobile-backdrop'}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-label="Закрыть меню"
      />

      <aside className={isMobileMenuOpen ? 'sidebar sidebar--mobile-open' : 'sidebar'}>
        <div>
          <div className="brand-card">
            <span className="brand-mark">
              <img src="/fintrack-logo.svg" alt="Логотип Финтрек" className="brand-logo" />
            </span>
            <div>
              <strong className="brand-name">Финтрек</strong>
              <p>Контроль личных финансов</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sync-status">
            <span className={isOnline ? 'status-pill status-pill--online' : 'status-pill status-pill--offline'}>
              {isOnline ? 'Онлайн' : 'Оффлайн'}
            </span>
            <p>Операций в очереди: {pendingCount}</p>
          </div>
          {isInstalled ? (
            <div className="pwa-note">
              <span className="status-pill status-pill--installed">PWA установлено</span>
              <p>Финтрек можно запускать как отдельное приложение с рабочего экрана.</p>
            </div>
          ) : null}
          {!isInstalled && installPrompt ? (
            <div className="pwa-note">
              <button type="button" className="primary-button install-button" onClick={handleInstallApp}>
                Установить приложение
              </button>
              <p>Установите Финтрек, чтобы открыть его без адресной строки и быстрее работать офлайн.</p>
            </div>
          ) : null}
          {!isInstalled && !installPrompt && showIosHint ? (
            <div className="pwa-note pwa-note--hint">
              <strong>Установка на iPhone и iPad</strong>
              <p>Откройте меню «Поделиться» в браузере и выберите пункт «На экран Домой».</p>
            </div>
          ) : null}
          <button type="button" className="secondary-button" onClick={handleManualSync} disabled={!isOnline}>
            Синхронизировать
          </button>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-main">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Открыть меню"
            >
              <span />
              <span />
              <span />
            </button>

            <div>
              <span className="eyebrow">Онлайн-платформа учета</span>
              <h1>{currentPageLabel === 'Дашборд' ? `Добро пожаловать, ${session?.user.fullName}` : currentPageLabel}</h1>
            </div>
          </div>

          <div>
            <div className="profile-card">
              <strong>{session?.user.role === 'admin' ? 'Администратор' : 'Профиль пользователя'}</strong>
              <span>{session?.user.email}</span>
            </div>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
