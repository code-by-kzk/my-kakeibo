
import { Routes, Route, Outlet } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage/LoginPage";
import PasskeySetupPage from "./pages/PasskeySetupPage/PasskeySetupPage";

import HomePage from "./pages/HomePage/HomePage";
import ExpensePage from "./pages/ExpensePage/ExpensePage";
import ExpenseListPage from "./pages/ExpenseListPage/ExpenseListPage";
import ExpenseDetailPage from "./pages/ExpenseDetailPage/ExpenseDetailPage";
import ExpenseEditPage from "./pages/ExpenseEditPage/ExpenseEditPage";
import AnalyticsPage from "./pages/AnalyticsPage/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import SettlementPage from "./pages/settlementsPage/SettlementPage";

import { AuthProvider } from "./contexts/AuthContext";
import { ExpenseProvider } from "./contexts/ExpenseContext";
import { CategoryProvider } from "./contexts/CategoryContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { SettlementProvider } from "./contexts/SettlementContext";

import ProtectedRoute from "./components/ProtectedRoute";

function AppProviders() {
  return (
    <SettingsProvider>
      <CategoryProvider>
        <ExpenseProvider>
          <SettlementProvider>
            <Outlet />
          </SettlementProvider>
        </ExpenseProvider>
      </CategoryProvider>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 認証不要 */}
        <Route
          path="/login"
          element={<LoginPage />}
        />
        <Route
          path="/passkey-setup"
          element={<PasskeySetupPage />}
        />

        {/* 認証必須 */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppProviders />}>
            <Route element={<MainLayout />}>
              <Route
                index
                element={<HomePage />}
              />
              <Route
                path="expenses/new"
                element={<ExpensePage />}
              />
              <Route
                path="expenses"
                element={<ExpenseListPage />}
              />
              <Route
                path="expenses/:id"
                element={<ExpenseDetailPage />}
              />
              <Route
                path="expenses/:id/edit"
                element={<ExpenseEditPage />}
              />
              <Route
                path="settlements"
                element={<SettlementPage />}
              />
              <Route
                path="analytics"
                element={<AnalyticsPage />}
              />
              <Route
                path="settings"
                element={<SettingsPage />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
