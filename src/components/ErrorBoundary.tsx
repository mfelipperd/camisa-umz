import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-100 font-sans">
            <div className="bg-red-900/20 border border-red-900/50 p-6 rounded-2xl max-w-md">
                <h1 className="text-2xl font-bold mb-4 text-red-500">Ops! Algo deu errado.</h1>
                <p className="text-zinc-400 mb-6">
                    Ocorreu um erro inesperado ao carregar a aplicação. Tente recarregar a página.
                </p>
                <div className="bg-black/30 p-4 rounded text-left text-xs text-red-400 font-mono overflow-auto max-h-40 mb-6">
                    {this.state.error?.toString()}
                </div>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                    Recarregar Página
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
