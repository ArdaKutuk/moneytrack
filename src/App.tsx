import { AppProvider, useAppContext } from "@/context/AppContext";
import { ToastProvider } from "@/hooks/useToast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { AddTransactionModal } from "@/features/transactions/AddTransactionModal";
import { Dashboard } from "@/pages/Dashboard";
import { Transactions } from "@/pages/Transactions";
import { Budgets } from "@/pages/Budgets";
import { Bills } from "@/pages/Bills";
import { Debts } from "@/pages/Debts";
import { Reports } from "@/pages/Reports";
import { Settings } from "@/pages/Settings";

function ActivePage() {
  const { page } = useAppContext();
  switch (page) {
    case "dashboard":
      return <Dashboard />;
    case "transactions":
      return <Transactions />;
    case "budgets":
      return <Budgets />;
    case "bills":
      return <Bills />;
    case "debts":
      return <Debts />;
    case "reports":
      return <Reports />;
    case "settings":
      return <Settings />;
  }
}

function Shell() {
  return (
    <div className="flex h-screen min-w-[1100px] bg-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <ErrorBoundary>
            <ActivePage />
          </ErrorBoundary>
        </div>
      </div>
      <AddTransactionModal />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
