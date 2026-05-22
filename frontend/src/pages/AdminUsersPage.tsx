import { useEffect, useState } from 'react';
import { AdminUsersSummary, api } from '../services/api';

export function AdminUsersPage() {
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .getAdminUsersSummary()
      .then(setSummary)
      .catch((loadError) => {
        const message =
          loadError instanceof Error ? loadError.message : 'Не удалось загрузить список пользователей';
        setError(message);
      });
  }, []);

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Администрирование</span>
          <h2>Пользователи системы Финтрек</h2>
          <p>
            На этой странице можно посмотреть зарегистрированных пользователей, их почты и сводную
            активность. Исходные пароли не отображаются, потому что система хранит их только в виде
            защищенного хэша.
          </p>
        </div>

        <div className="hero-highlight hero-highlight--stable">
          <span>Всего пользователей</span>
          <strong>{summary?.totalUsers ?? 0}</strong>
          <p>Админ-представление создано для демонстрации данных системы и контроля регистраций.</p>
        </div>
      </section>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel">
        <div className="panel-heading">
          <h3>Список учетных записей</h3>
          <p>Почта, имя пользователя, количество операций и состояние хранения пароля.</p>
        </div>

        <div className="admin-users-list">
          {summary?.users.length ? (
            summary.users.map((user) => (
              <article className="admin-user-card" key={user.id}>
                <div className="admin-user-card__header">
                  <div>
                    <strong>{user.fullName}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span className="badge badge--manual">ID: {user.id.slice(0, 8)}</span>
                </div>

                <div className="admin-user-card__grid">
                  <div>
                    <span>Операций</span>
                    <strong>{user.transactionsCount}</strong>
                  </div>
                  <div>
                    <span>Последняя активность</span>
                    <strong>
                      {user.lastTransactionDate
                        ? new Date(user.lastTransactionDate).toLocaleString('ru-RU')
                        : 'Пока нет операций'}
                    </strong>
                  </div>
                </div>

                <div className="admin-user-card__footer">
                  <span>Пароль</span>
                  <strong>{user.passwordStatus}</strong>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">Пользователи пока не найдены.</div>
          )}
        </div>
      </section>
    </div>
  );
}
