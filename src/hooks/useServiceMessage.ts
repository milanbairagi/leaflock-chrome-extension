
type ServiceMessage<T = unknown> = {
  type: string;
  payload?: T;
};

type ServiceResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
};

/**
 * Sends a message to the service worker (background script)
 * @param message - The message object containing type and optional payload
 * @returns Promise resolving to the response from the service worker
 * @throws Error if the message fails to send or Chrome runtime is not available
 */
export const sendServiceMessage = async <TPayload = unknown, TResponse = unknown>(
  message: ServiceMessage<TPayload>
): Promise<ServiceResponse<TResponse>> => {
  try {
    if (!chrome?.runtime) {
      throw new Error("Chrome runtime is not available");
    }

    const response = await chrome.runtime.sendMessage(message);
    return response as ServiceResponse<TResponse>;
  } catch (error) {
    console.error("[LeafLock] Failed to send service message:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};