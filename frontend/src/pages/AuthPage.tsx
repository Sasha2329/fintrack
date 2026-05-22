import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { getStoredSession, saveSession } from '../services/auth';

type AuthMode = 'login' | 'register';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const hasStoredSession = getStoredSession() !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response =
        mode === 'register'
          ? await api.register({ fullName, email, password })
          : await api.login({ email, password });

      saveSession(response as never);
      navigate('/');
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Не удалось выполнить вход';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-hero">
        <div className="hero-content">
          <div className="brand-card brand-card--hero">
            <span className="brand-mark brand-mark--hero">
              <img src="/fintrack-logo.svg" alt="Логотип Финтрек" className="brand-logo" />
            </span>
            <div>
              <strong className="brand-name">Финтрек</strong>
              <p>Минималистичная платформа контроля личных финансов</p>
            </div>
          </div>

          <span className="eyebrow">Финтрек</span>
          <h1>Онлайн-учет и управление личными финансами в одном окне</h1>
          <p>
            Отслеживайте доходы и расходы, анализируйте категории трат и собирайте базовую
            финансовую картину для дипломного проекта.
          </p>

          <div className="hero-points">
            <div>
              <strong>01</strong>
              <span>Безопасная регистрация и вход через JWT</span>
            </div>
            <div>
              <strong>02</strong>
              <span>Базовый дашборд с балансом, категориями и историей</span>
            </div>
            <div>
              <strong>03</strong>
              <span>Масштабируемая архитектура под дальнейшее развитие диплома</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-toggle">
            <button
              type="button"
              className={mode === 'register' ? 'auth-toggle__button active' : 'auth-toggle__button'}
              onClick={() => setMode('register')}
            >
              Регистрация
            </button>
            <button
              type="button"
              className={mode === 'login' ? 'auth-toggle__button active' : 'auth-toggle__button'}
              onClick={() => setMode('login')}
            >
              Вход
            </button>
          </div>

          <div>
            <h2>{mode === 'register' ? 'Создайте аккаунт' : 'Войдите в систему'}</h2>
            <p>Начните вести учет финансов уже сейчас.</p>
          </div>

          {!navigator.onLine ? (
            <div className="success-banner">
              {hasStoredSession
                ? 'Сеть недоступна. Если вы уже входили в приложение на этом устройстве, откройте Финтрек через сохранённую сессию.'
                : 'Сеть недоступна. Первый вход и регистрация возможны только после восстановления подключения.'}
            </div>
          ) : null}

          {mode === 'register' ? (
            <label>
              ФИО
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </label>
          ) : null}

          <label>
            {mode === 'login' ? 'Email или логин администратора' : 'Email'}
            <input
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Пароль
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {error ? <div className="error-banner">{error}</div> : null}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Подождите...'
              : mode === 'register'
                ? 'Зарегистрироваться'
                : 'Войти'}
          </button>
        </form>
      </section>
    </div>
  );
}
