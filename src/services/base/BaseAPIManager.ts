import { AxiosResponse } from 'axios';
import { httpClient } from '../../infrastructure/httpClient';
import { logger } from '../../infrastructure/logger';

export abstract class BaseAPIManager {
  protected abstract readonly serviceName: string;

  protected async retryRequest<T>(
    fn: () => Promise<AxiosResponse<T>>,
    maxRetries: number = 3,
  ): Promise<AxiosResponse<T>> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        logger.error(
          `${this.serviceName} API 호출 실패 (시도 ${attempt + 1}/${maxRetries})`,
          error,
        );

        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  protected get http() {
    return httpClient;
  }
}
