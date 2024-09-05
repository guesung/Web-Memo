import type { ErrorInfo, PropsWithChildren, ReactElement } from 'react';
import { Component } from 'react';

interface ErrorBoundaryProps extends PropsWithChildren {
  fallback: ReactElement;
  onReset?: () => void;
}
interface ErrorBoundaryState {
  error: Error | null;
}
const initialState: ErrorBoundaryState = {
  error: null,
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // state = { error: null };
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.setState(initialState);
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // TODO : log error
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

    if (error) {
      return <div>{error.message}</div>;
    }

    return this.props.children;
  }
}
