import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuthPage } from './pages/AuthPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForecastPage } from './pages/ForecastPage';
import { GoalsPage } from './pages/GoalsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SandboxWalletPage } from './pages/SandboxWalletPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { WalletHistoryPage } from './pages/WalletHistoryPage';
import { getStoredSession } from './services/auth';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const session = getStoredSession();
  return session ? children : <Navigate to="/auth" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="forecast" element={<ForecastPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="sandbox-wallet" element={<SandboxWalletPage />} />
        <Route path="sandbox-wallet/history" element={<WalletHistoryPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
