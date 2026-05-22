import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { initialSync, flushOnUnload } from './lib/sync';
import { checkUpcomingNotifications } from './lib/notifications';
import { ErrorBoundary } from './components/error-boundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

void initialSync();
flushOnUnload();
// Проверка уведомлений раз в загрузку (с внутренним 6-часовым троттлингом)
void checkUpcomingNotifications(import.meta.env.BASE_URL);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
