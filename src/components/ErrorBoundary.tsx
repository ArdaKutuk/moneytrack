import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render-time crashes so a bug in one page can't take down the
 * whole app with a blank white screen — the user always gets feedback and
 * a way back, never a silent freeze. */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Moneytrack render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-bg text-text px-6 text-center gap-3">
          <AlertTriangle size={28} className="text-accent-red" />
          <div className="text-lg font-bold">Something went wrong</div>
          <div className="text-sm text-text-secondary max-w-sm">
            {this.state.error.message || "An unexpected error occurred."} Your data is safe — it lives in the
            local database, not in this window.
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 bg-accent-green text-[#07120e] px-4 py-2 rounded-control text-sm font-bold"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
