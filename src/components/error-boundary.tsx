import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-bg-elevated border border-danger/40 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3 text-danger">
            <AlertTriangle size={20} />
            <h2 className="display-title text-xl">Что-то сломалось</h2>
          </div>
          <p className="text-2xs text-text-muted leading-relaxed mb-3">
            Приложение упало на исключении. Данные в IndexedDB не повреждены — попробуй обновить страницу.
          </p>
          <details className="text-2xs text-text-dim mb-4">
            <summary className="cursor-pointer text-text-muted">Подробности</summary>
            <pre className="mt-2 p-2 bg-bg rounded font-mono text-2xs overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
              {this.state.error.stack ? '\n\n' + this.state.error.stack.split('\n').slice(0, 5).join('\n') : ''}
            </pre>
          </details>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="flex-1 py-2.5 rounded-lg border border-border text-text-muted text-sm active:border-accent"
            >
              Попробовать снова
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} /> Перезагрузить
            </button>
          </div>
        </div>
      </div>
    );
  }
}
