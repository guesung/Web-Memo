import * as Sentry from '@sentry/react';
import { overlay } from 'overlay-kit';
import type { ComponentType, ErrorInfo, PropsWithChildren } from 'react';
import { Component } from 'react';
import Toast from './Toast';

export interface FallbackComponentProps {
  error: Error;
  resetErrorBoundary: () => void;
}
interface ErrorBoundaryProps extends PropsWithChildren {
  FallbackComponent?: ComponentType<FallbackComponentProps>;
  onReset?: () => void;
}
interface ErrorBoundaryState {
  error: Error | null;
}
const initialState: ErrorBoundaryState = {
  error: null,
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = initialState;
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line import/namespace
    Sentry.captureException(error);
    console.error(error, errorInfo);
  }

  render() {
    const { error } = this.state;
    if (error) {
      overlay.open(({ unmount }) => <Toast message={error.message} onClose={unmount} />);
    }
    return this.props.children;
  }
}
