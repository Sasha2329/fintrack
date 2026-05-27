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
    const completedMonths = sortedMonths.filter((month) => month !== currentMonth);
    const recentMonths = completedMonths.slice(-6);

    const currentMonthBucket = monthBuckets[currentMonth] ?? {
      income: 0,
      expense: 0,
      categories: {}
    };

    const averageIncome = this.weightedAverage(
      recentMonths.map((month) => monthBuckets[month].income)
    );
    const averageExpense = this.weightedAverage(
      recentMonths.map((month) => monthBuckets[month].expense)
    );

    const currentBalance = transactions.reduce((acc, transaction) => {
      const amount = Number(transaction.amount);
      return transaction.type === TransactionType.INCOME ? acc + amount : acc - amount;
    }, 0);

    const currentDate = new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const elapsedDays = Math.max(currentDate.getDate(), 1);
    const elapsedRatio = Math.min(1, elapsedDays / Math.max(daysInMonth, 1));

    const paceIncome = elapsedRatio > 0 ? currentMonthBucket.income / elapsedRatio : currentMonthBucket.income;
    const paceExpense = elapsedRatio > 0 ? currentMonthBucket.expense / elapsedRatio : currentMonthBucket.expense;

    const historicalIncome = recentMonths.length ? averageIncome : paceIncome;
    const historicalExpense = recentMonths.length ? averageExpense : paceExpense;

    const forecastIncome = Math.max(
      0,
      recentMonths.length
        ? historicalIncome * 0.6 + paceIncome * 0.4
        : paceIncome
    );
    const forecastExpenseBase = Math.max(
      0,
      recentMonths.length
        ? historicalExpense * 0.55 + paceExpense * 0.45
        : paceExpense
    );

    const expenseVolatility = this.standardDeviation(
      recentMonths.map((month) => monthBuckets[month].expense)
    );
    const forecastExpense = Math.max(0, forecastExpenseBase + expenseVolatility * 0.15);
    const forecastBalance = currentBalance + forecastIncome - forecastExpense;
    const reserveTarget = Math.max(forecastExpense * 0.3, forecastIncome * 0.18, expenseVolatility * 0.8);
    const projectedSavings = Math.max(0, forecastIncome - forecastExpense);
    const safeSpendLimit = Math.max(0, forecastIncome - reserveTarget);

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

    const confidenceScore = Math.max(
      35,
      Math.min(
        96,
        Math.round(
          55 +
            recentMonths.length * 5 -
            (forecastExpense > 0 ? (expenseVolatility / forecastExpense) * 18 : 0)
        )
      )
    );

    const healthScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          50 +
            (forecastIncome > 0 ? ((forecastIncome - forecastExpense) / forecastIncome) * 42 : 0) +
            currentBalance / 7000 +
            confidenceScore / 8
        )
      )
    );

    const recommendations = [
      forecastExpense > safeSpendLimit
        ? `Прогноз показывает перерасход относительно безопасного лимита. Лучше удержать траты в пределах ${safeSpendLimit.toLocaleString('ru-RU')} ₽.`
        : `Текущий темп расходов выглядит управляемым. Можно ориентироваться на лимит около ${safeSpendLimit.toLocaleString('ru-RU')} ₽.`,
      reserveTarget > 0
        ? `На следующий месяц желательно оставить резерв не ниже ${reserveTarget.toLocaleString('ru-RU')} ₽.`
        : 'Рекомендуется сформировать хотя бы минимальный резерв на следующий месяц.',
      projectedSavings > 0
        ? `При текущем сценарии можно сохранить около ${projectedSavings.toLocaleString('ru-RU')} ₽ свободного остатка.`
        : 'При текущем сценарии накопления не формируются: стоит пересмотреть постоянные расходы или усилить доходную часть.',
      topExpenseCategories[0]
        ? `Наибольшее влияние на прогноз оказывают траты в категории «${topExpenseCategories[0].name}». Именно здесь полезнее всего искать оптимизацию.`
        : 'Для более точного прогноза нужно накопить больше истории операций.',
      confidenceScore < 60
        ? 'Точность прогноза пока ограничена: истории операций ещё мало или траты сильно скачут по месяцам.'
        : 'Истории операций достаточно, чтобы использовать прогноз как рабочий ориентир на следующий месяц.'
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
      projectedSavings: Number(projectedSavings.toFixed(2)),
      expenseVolatility: Number(expenseVolatility.toFixed(2)),
      confidenceScore,
      healthScore,
      topExpenseCategories,
      recommendations
    };
  }

  private weightedAverage(values: number[]) {
    if (!values.length) {
      return 0;
    }

    const weights = values.map((_, index) => index + 1);
    const weightedSum = values.reduce((sum, value, index) => sum + value * weights[index], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    return weightedSum / Math.max(totalWeight, 1);
  }

  private standardDeviation(values: number[]) {
    if (values.length < 2) {
      return 0;
    }

    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance =
      values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

    return Math.sqrt(variance);
  }
}
