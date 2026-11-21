
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage/LoginPage";
import HomePage from "./pages/HomePage/HomePage";
import ExpensePage from "./pages/ExpensePage/ExpensePage";
import ExpenseListPage from "./pages/ExpenseListPage/ExpenseListPage";
import ExpenseDetailPage from "./pages/ExpenseDetailPage/ExpenseDetailPage";
import ExpenseEditPage from "./pages/ExpenseEditPage/ExpenseEditPage";
import AnalyticsPage from "./pages/AnalyticsPage/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import { ExpenseProvider } from "./contexts/ExpenseContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { SettlementProvider } from "./contexts/SettlementContext";
import SettlementPage from "./pages/settlements/SettlementPage";

export default function App() {
  return (
    <SettingsProvider>
      <ExpenseProvider>
        <SettlementProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="expenses/new" element={<ExpensePage />} />
              <Route path="expenses" element={<ExpenseListPage />} />
              <Route path="expenses/:id" element={<ExpenseDetailPage />} />
              <Route path="expenses/:id/edit" element={<ExpenseEditPage />} />
              <Route path="settlements" element={<SettlementPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </SettlementProvider>
      </ExpenseProvider>
    </SettingsProvider>
  );
}
