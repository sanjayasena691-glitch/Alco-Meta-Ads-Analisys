import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare readonly props: Readonly<ErrorBoundaryProps>;
  declare setState: (
    state:
      | ErrorBoundaryState
      | Partial<ErrorBoundaryState>
      | ((prevState: Readonly<ErrorBoundaryState>, props: Readonly<ErrorBoundaryProps>) => ErrorBoundaryState | Partial<ErrorBoundaryState> | null),
    callback?: () => void
  ) => void;

  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: undefined,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kesalahan saat menampilkan data.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ALCO UI ErrorBoundary caught runtime error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] w-full flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-rose-200 p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {this.props.fallbackTitle || 'Terjadi Kendala Saat Memuat Tampilan'}
                </h2>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Sistem mendeteksi data yang tidak lengkap atau format yang tidak terduga saat merender halaman.
                  Data Anda aman dan aplikasi tetap terlindungi.
                </p>
              </div>
            </div>

            {this.state.errorMessage && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium break-words">
                Detail: {this.state.errorMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Coba Muat Ulang Tampilan</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Muat Ulang Aplikasi</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
