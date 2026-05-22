import { useEffect, useMemo, useState } from 'react';
import { api, TransactionItem } from '../services/api';

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [month, setMonth] = useState(currentMonthKey());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getTransactions().then(setTransactions).catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  const monthTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.transactionDate.slice(0, 7) === month),
    [month, transactions]
  );

  const totals = monthTransactions.reduce(
    (acc, transaction) => {
      const amount = Number(transaction.amount);
      if (transaction.type === 'income') {
        acc.income += amount;
      } else {
        acc.expense += amount;
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  function exportCsv() {
    const rows = [
      ['Дата', 'Тип', 'Категория', 'Название', 'Сумма', 'Источник'].join(';'),
      ...monthTransactions.map((transaction) =>
        [
          transaction.transactionDate,
          transaction.type,
          transaction.category,
          transaction.title,
          transaction.amount,
          transaction.source
        ].join(';')
      )
    ].join('\n');

    downloadFile(`fintrack-report-${month}.csv`, rows, 'text/csv;charset=utf-8');
  }

  function exportJson() {
    downloadFile(
      `fintrack-report-${month}.json`,
      JSON.stringify({ month, totals, transactions: monthTransactions }, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function printReport() {
    const reportHtml = `
      <html>
        <head>
          <title>Отчет Финтрек ${month}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; }
            h1, h2 { margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Отчет Финтрек за ${month}</h1>
          <p>Доходы: ${totals.income.toLocaleString('ru-RU')} ₽</p>
          <p>Расходы: ${totals.expense.toLocaleString('ru-RU')} ₽</p>
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Категория</th>
                <th>Название</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              ${monthTransactions
                .map(
                  (transaction) => `
                    <tr>
                      <td>${new Date(transaction.transactionDate).toLocaleDateString('ru-RU')}</td>
                      <td>${transaction.type === 'income' ? 'Доход' : 'Расход'}</td>
                      <td>${transaction.category}</td>
                      <td>${transaction.title}</td>
                      <td>${Number(transaction.amount).toLocaleString('ru-RU')} ₽</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  return (
    <div className="page-grid">
      <section className="hero-banner panel">
        <div className="hero-banner__content">
          <span className="eyebrow">Отчеты</span>
          <h2>Экспорт отчетов по операциям и категориям</h2>
          <p>
            Здесь можно сформировать отчет за месяц и выгрузить его в CSV для Excel, JSON для
            интеграций или распечатать для сохранения в PDF.
          </p>
        </div>

        <div className="hero-highlight">
          <span>Записей в отчете</span>
          <strong>{monthTransactions.length}</strong>
          <p>Отчет включает операции, суммы, категории и источник поступления данных.</p>
        </div>
      </section>

      <section className="panel planner-panel">
        <div className="panel-heading">
          <h3>Настройка отчета</h3>
          <p>Выберите период и способ выгрузки.</p>
        </div>

        <div className="planner-grid">
          <label>
            Месяц отчета
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
          <div className="report-summary">
            <span>Доходы: {totals.income.toLocaleString('ru-RU')} ₽</span>
            <span>Расходы: {totals.expense.toLocaleString('ru-RU')} ₽</span>
          </div>
        </div>

        <div className="toolbar-actions">
          <button type="button" className="secondary-button" onClick={exportCsv}>
            Экспорт в Excel (CSV)
          </button>
          <button type="button" className="secondary-button" onClick={exportJson}>
            Экспорт JSON
          </button>
          <button type="button" className="primary-button" onClick={printReport}>
            Печать / PDF
          </button>
        </div>
      </section>
    </div>
  );
}
