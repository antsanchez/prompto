import { Injectable } from '@angular/core';
import { ERROR_MESSAGES } from '../core/constants';

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  handleError(context: string, error: unknown): string {
    console.error(context, error);

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return ERROR_MESSAGES.GENERIC;
  }

  getGenericError(): string {
    return ERROR_MESSAGES.GENERIC;
  }

  getModelsFetchError(): string {
    return ERROR_MESSAGES.MODELS_FETCH;
  }

  getArenaStartError(): string {
    return ERROR_MESSAGES.ARENA_START;
  }

  getArenaLoadError(): string {
    return ERROR_MESSAGES.ARENA_LOAD;
  }

  getArenaChatError(): string {
    return ERROR_MESSAGES.ARENA_CHAT;
  }

  getNoApiKeyError(): string {
    return ERROR_MESSAGES.NO_API_KEY;
  }

  formatError(context: string, error: unknown): string {
    const message = this.getErrorMessage(error);
    return `${context} ${message}`;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unexpected error occurred.';
  }
}
