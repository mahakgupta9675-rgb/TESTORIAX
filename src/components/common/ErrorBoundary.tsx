import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import logger from '../../services/loggerService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Unhandled React Rendering Error caught by ErrorBoundary', error, {
      componentStack: errorInfo.componentStack
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
            <AlertTriangle size={32} />
          </div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-white mb-2">
            Something unexpected occurred
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            Testora encountered an unexpected issue while rendering this view. Your progress and answer data remain safely stored.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-97"
            >
              <RefreshCw size={14} />
              <span>Reload Page</span>
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs rounded-xl border border-white/10 flex items-center gap-2 cursor-pointer transition-all active:scale-97"
            >
              <Home size={14} />
              <span>Return Home</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
