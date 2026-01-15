import React, { useState, useEffect } from 'react';
import { logError } from '../../lib/logger';

interface AsyncErrorBoundaryProps {
  children: (props: { setError: (e: Error) => void }) => React.ReactNode;
  fallback?: React.ReactNode;
}

export function AsyncErrorBoundary({ children, fallback }: AsyncErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (error) {
      logError('AsyncErrorBoundary', error);
    }
  }, [error]);

  if (error) {
    return fallback || (
      <div className="p-4 text-center text-red-600">
        <h2>Произошла асинхронная ошибка.</h2>
        <p>Пожалуйста, попробуйте позже.</p>
      </div>
    );
  }

  return <>{children({ setError })}</>;
}
