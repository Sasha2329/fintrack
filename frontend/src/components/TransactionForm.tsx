import { FormEvent, useState } from 'react';
import { TransactionPayload } from '../services/api';

interface TransactionFormProps {
  onSubmit: (payload: TransactionPayload) => Promise<void>;
}

const initialState: TransactionPayload = {
  title: '',
  type: 'expense',
  amount: 0,
  category: '',
  note: '',
  transactionDate: new Date().toISOString().slice(0, 10)
};

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [form, setForm] = useState<TransactionPayload>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await onSubmit(form);
      setForm(initialState);
      setSuccessMessage(
        navigator.onLine
          ? 'Операция сохранена и уже участвует в аналитике.'
          : 'Операция сохранена офлайн и будет отправлена на сервер после восстановления сети.'
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'Не удалось сохранить операцию';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form-panel" onSubmit={handleSubmit}>
      <div className="panel-heading">
        <h3>Новая операция</h3>
        <p>Добавьте доход или расход, чтобы увидеть движение средств.</p>
      </div>

      <div className="form-grid">
        <label>
          Название
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Например, Зарплата или Аренда"
            required
          />
        </label>

        <label>
          Тип
          <select
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                type: event.target.value as TransactionPayload['type']
              }))
            }
          >
            <option value="income">Доход</option>
            <option value="expense">Расход</option>
          </select>
        </label>

        <label>
          Сумма
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount || ''}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, amount: Number(event.target.value) }))
            }
            required
          />
        </label>

        <label>
          Категория
          <input
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Продукты, Инвестиции, Транспорт"
            required
          />
        </label>

        <label>
          Дата операции
          <input
            type="date"
            value={form.transactionDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, transactionDate: event.target.value }))
            }
            required
          />
        </label>
      </div>

      <label>
        Комментарий
        <textarea
          value={form.note}
          onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
          placeholder="Краткая заметка по операции"
          rows={4}
        />
      </label>

      {error ? <div className="error-banner">{error}</div> : null}
      {successMessage ? <div className="success-banner">{successMessage}</div> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Сохраняем...' : 'Добавить операцию'}
      </button>
    </form>
  );
}
