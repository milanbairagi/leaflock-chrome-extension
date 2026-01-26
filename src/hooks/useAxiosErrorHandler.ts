import { useState, useCallback, useRef, type RefObject } from "react";
import { isAxiosError, type AxiosError } from "axios";

interface UseAxiosErrorHandlerReturn {
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  isNetworkError: RefObject<boolean>;
  isTimeoutError: RefObject<boolean>;
  isServerError: RefObject<boolean>;
  isAuthError: RefObject<boolean>;
  handleError: (error: unknown) => void;
  clearError: () => void;
}

/**
 * Custom hook to handle axios errors with user-friendly messages
 * Provides detailed error classification and retry capability
 */
export const useAxiosErrorHandler = (): UseAxiosErrorHandlerReturn => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isNetworkError = useRef(false);
  const isTimeoutError = useRef(false);
  const isServerError = useRef(false);
  const isAuthError = useRef(false);

  const handleError = useCallback((error: AxiosError | unknown) => {
    isNetworkError.current = false;
    isTimeoutError.current = false;
    isServerError.current = false;
    isAuthError.current = false;

    if (error && isAxiosError(error)) {

      // Handle network errors
      if (error.code === "ERR_NETWORK") {
        isNetworkError.current = true;
        setErrorMessage(
          "Network error: Unable to reach the server. Please check your connection or try again later."
        );
      }
      // Handle timeout errors
      else if (error.code === "ECONNABORTED") {
        isTimeoutError.current = true;
        setErrorMessage(
          "Request timeout: Server is taking too long to respond. Please try again."
        );
      }
      // Handle server errors (5xx)
      else if (error.response?.status && error.response.status >= 500) {
        isServerError.current = true;
        setErrorMessage(
          "Server error: The server is temporarily unavailable. Please try again later."
        );
      }
      // Handle authentication errors
      else if (error.response?.status === 401) {
        isAuthError.current = true;
        setErrorMessage("Session expired. Please log in again.");
      }
      // Handle validation errors
      else if (error.response?.status === 400) {
        isAuthError.current = true;
        setErrorMessage("Invalid input. Please check your information and try again.");
      }
      // Handle client errors (4xx)
      else if (error.response?.status) {
        setErrorMessage(
          `Error: ${error.response.statusText}. Please try again.`
        );
      }
      // Handle other network-related errors
      else if (
        error.code === "ECONNREFUSED" ||
        error.code === "ENOTFOUND" ||
        !error.response
      ) {
        isNetworkError.current = true;
        setErrorMessage(
          "Connection failed. Please check your internet connection and try again."
        );
      } else {
        setErrorMessage("An error occurred. Please try again.");
      }
    } else {
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    isNetworkError.current = false;
    isTimeoutError.current = false;
    isServerError.current = false;
    isAuthError.current = false;
  }, []);

  return {
    errorMessage,
    setErrorMessage,
    isNetworkError,
    isTimeoutError,
    isServerError,
    isAuthError,
    handleError,
    clearError,
  };
};
