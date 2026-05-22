import { Injectable } from '@nestjs/common';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { TransactionsService } from '../transactions/transactions.service';

interface MonthBucket {
  income: number;
  expense: number;
  categories: Record<string, number>;
}

@Injectable()
export class ForecastService {
  constructor(private readonly transactionsService: TransactionsService) {}

  async getForecast(userId: string) {
    const transactions = await this.transactionsService.findAllByUser(userId);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const monthBuckets = transactions.reduce<Record<string, MonthBucket>>((acc, transaction) => {
      const monthKey = transaction.transactionDate.toISOString().slice(0, 7);
      const amount = Number(transaction.amount);

      if (!acc[monthKey]) {
        acc[monthKey] = {
          income: 0,
          expense: 0,
          categories: {}
        };
      }

      if (transaction.type === TransactionType.INCOME) {
        acc[monthKey].income += amount;
      } else {
        acc[monthKey].expense += amount;
        acc[monthKey].categories[transaction.category] =
          (acc[monthKey].categories[transaction.category] ?? 0) + amount;
      }

      return acc;
    }, {});

    const sortedMonths = Object.keys(monthBuckets).sort();
    const recentMonths = sortedMonths.slice(-3);

    const averageIncome = this.average(
      recentMonths.map((month) => monthBuckets[month].income),
      recentMonths.length || 1
    );
    const averageExpense = this.average(
      recentMonths.map((month) => monthBuckets[month].expense),
      recentMonths.length || 1
    );

    const currentMonthBucket = monthBuckets[currentMonth] ?? {
      income: 0,
      expense: 0,
      categories: {}
    };

    const currentBalance = transactions.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      return transaction.type === TransactionType.INCOME ? acc + amount : acc - amount;
    }, 0);

    const trendIncome = recentMonths.length
      ? currentMonthBucket.income - averageIncome
      : currentMonthBucket.income;
    const trendExpense = recentMonths.length
      ? currentMonthBucket.expense - averageExpense
      : currentMonthBucket.expense;

    const forecastIncome = Math.max(0, averageIncome + trendIncome * 0.35);
    const forecastExpense = Math.max(0, averageExpense + trendExpense * 0.45);
    const forecastBalance = currentBalance + forecastIncome - forecastExpense;
    const safeSpendLimit = Math.max(0, forecastIncome * 0.7);
    const reserveTarget = Math.max(0, forecastIncome * 0.2);

    const topExpenseCategories = Object.entries(
      recentMonths.reduce<Record<string, number>>((acc, month) => {
        for (const [category, total] of Object.entries(monthBuckets[month].categories)) {
          acc[category] = (acc[category] ?? 0) + total;
        }
        return acc;
      }, {})
    )
      .map(([name, total]) => ({
        name,
        total: Number(total.toFixed(2))
      }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 4);

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          50 +
            (forecastIncome > 0 ? ((forecastIncome - forecastExpense) / forecastIncome) * 35 : 0) +
            currentBalance / 5000
        )
      )
    );

    const recommendations = [
      forecastExpense > safeSpendLimit
        ? 'Прогнозируемые расходы превышают безопасный уровень. Имеет смысл сократить необязательные траты.'
        : 'Прогноз по расходам находится в безопасной зоне. Текущий темп можно считать контролируемым.',
      reserveTarget > 0
        ? `Рекомендуемый резерв на следующий месяц: ${reserveTarget.toLocaleString('ru-RU')} ₽.`
        : 'Рекомендуется сформировать небольшой финансовый резерв на следующий месяц.',
      topExpenseCategories[0]
        ? `Наибольшее влияние на прогноз оказывают траты в категории «${topExpenseCategories[0].name}».`
        : 'Для более точного прогноза нужно накопить больше истории операций.'
    ];

    return {
      currentBalance: Number(currentBalance.toFixed(2)),
      currentMonth,
      monthsAnalyzed: recentMonths,
      averageIncome: Number(averageIncome.toFixed(2)),
      averageExpense: Number(averageExpense.toFixed(2)),
      forecastIncome: Number(forecastIncome.toFixed(2)),
      forecastExpense: Number(forecastExpense.toFixed(2)),
      forecastBalance: Number(forecastBalance.toFixed(2)),
      safeSpendLimit: Number(safeSpendLimit.toFixed(2)),
      reserveTarget: Number(reserveTarget.toFixed(2)),
      healthScore,
      topExpenseCategories,
      recommendations
    };
  }

  private average(values: number[], fallbackDivisor: number) {
    if (!values.length) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / Math.max(fallbackDivisor, 1);
  }
}

