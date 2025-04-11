import type { Category } from './constant';

export class ExtensionError extends Error {
  constructor(
    message: string,
    public code: ExtensionErrorCode,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

export enum ExtensionErrorCode {
  COMMUNICATION_ERROR = 'COMMUNICATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  CONTENT_ERROR = 'CONTENT_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  TAB_ERROR = 'TAB_ERROR',
  YOUTUBE_ERROR = 'YOUTUBE_ERROR',
}

export interface PageContent {
  content: string;
  category: Category;
}
