import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getStoredSession } from '../services/auth';
import { getPendingTransactionsCount, syncPendingTransactions } from '../services/api';
import { BeforeInstallPromptEvent, canShowIosInstallHint, isStandaloneMode } from '../services/pwa';

function MobileNavIcon({ kind }: { kind: 'menu' | 'home' | 'wallet' | 'plus' | 'profile' }) {
  switch (kind) {
    case 'menu':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 10.8 12 4l8 6.8" />
          <path d="M7 10.5V20h10v-9.5" />
        </svg>
      );
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 8.5h16" />
          <path d="M6 8.5V7a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 7v1.5" />
          <rect x="4" y="8.5" width="16" height="10" rx="2.5" />
          <path d="M15.5 12.2h4v2.3h-4a1.15 1.15 0 1 1 0-2.3Z" />
        </svg>
      );
    case 'plus':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case 'profile':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19c1.6-3 4-4.5 7-4.5S17.4 16 19 19" />
        </svg>
      );
  }
}

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
    { to: '/sandbox-wallet', label: 'Кошелёк' },
    { to: '/sandbox-wallet/history', label: 'История кошелька' },
    { to: '/transactions', label: 'Операции' }
  ];
  const currentPageLabel =
    navigation.find((item) => item.to === location.pathname)?.label ?? 'Финтрек';
  const mobileNavItems = [
    {
      key: 'menu',
      label: 'Меню',
      icon: 'menu' as const,
      action: () => setIsMobileMenuOpen((prev) => !prev),
      isActive: isMobileMenuOpen
    },
    {
      key: 'dashboard',
      label: 'Главная',
      icon: 'home' as const,
      to: '/'
    },
    {
      key: 'wallet',
      label: 'Кошелёк',
      icon: 'wallet' as const,
      to: '/sandbox-wallet'
    },
    {
      key: 'new-transaction',
      label: 'Добавить',
      icon: 'plus' as const,
      to: '/transactions#transaction-form',
      accent: true
    },
    {
      key: 'profile',
      label: 'Профиль',
      icon: 'profile' as const,
      to: '/profile'
    }
  ];

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

        <footer className="site-footer panel">
          <div>
            <strong>Финтрек</strong>
            <p>Веб-приложение для учёта личных финансов, контроля бюджета и истории операций.</p>
          </div>
          <div>
            <strong>Контакты</strong>
            <p>Связь для демонстрации и обратной связи: fintrack.support@demo.local</p>
          </div>
          <div>
            <strong>Версия</strong>
            <p>PWA-версия с облачным backend, офлайн-очередью и синхронизацией операций.</p>
          </div>
        </footer>

        <nav className="mobile-bottom-nav" aria-label="Нижняя навигация">
          {mobileNavItems.map((item) => {
            if ('action' in item) {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={item.isActive ? 'mobile-bottom-nav__item mobile-bottom-nav__item--active' : 'mobile-bottom-nav__item'}
                  onClick={item.action}
                  aria-label={item.label}
                >
                  <span className="mobile-bottom-nav__icon">
                    <MobileNavIcon kind={item.icon} />
                  </span>
                  <span className="mobile-bottom-nav__label">{item.label}</span>
                </button>
              );
            }

            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : item.to
                  ? location.pathname === item.to || (item.to.startsWith('/transactions') && location.pathname === '/transactions')
                  : false;

            return (
              <NavLink
                key={item.key}
                to={item.to ?? '/'}
                className={
                  item.accent
                    ? isActive
                      ? 'mobile-bottom-nav__item mobile-bottom-nav__item--accent mobile-bottom-nav__item--active'
                      : 'mobile-bottom-nav__item mobile-bottom-nav__item--accent'
                    : isActive
                      ? 'mobile-bottom-nav__item mobile-bottom-nav__item--active'
                      : 'mobile-bottom-nav__item'
                }
                aria-label={item.label}
              >
                <span className="mobile-bottom-nav__icon">
                  <MobileNavIcon kind={item.icon} />
                </span>
                <span className="mobile-bottom-nav__label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
