import * as Sentry from '@sentry/react';
import type { ComponentType, ErrorInfo, PropsWithChildren } from 'react';
import { Component, createElement } from 'react';

import ErrorFallback from './ErrorFallback';

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

  resetErrorBoundary() {
    const { error } = this.state;
    if (error) {
      this.props.onReset?.();
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    const { children, FallbackComponent } = this.props;
    let childToRender = children;
    if (error) {
      const props: FallbackComponentProps = { error, resetErrorBoundary: this.resetErrorBoundary };
      childToRender = createElement(FallbackComponent ?? ErrorFallback, props);
    }
    return childToRender;
  }
}
