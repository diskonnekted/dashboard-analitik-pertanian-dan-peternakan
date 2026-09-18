import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="bg-white border border-red-200 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-slate-500 mb-1">{this.state.error?.message}</p>
            <p className="text-xs text-slate-400 mb-6">Silakan muat ulang halaman jika masalah berlanjut.</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-mono text-sm font-bold hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={14} />
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
