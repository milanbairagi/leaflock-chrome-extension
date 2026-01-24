import { useState, useCallback } from "react";
import { isAxiosError, type AxiosError } from "axios";

interface UseAxiosErrorHandlerReturn {
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  isNetworkError: boolean;
  isTimeoutError: boolean;
  isServerError: boolean;
  isAuthError: boolean;
  handleError: (error: unknown) => void;
  clearError: () => void;
}

/**
 * Custom hook to handle axios errors with user-friendly messages
 * Provides detailed error classification and retry capability
 */
export const useAxiosErrorHandler = (): UseAxiosErrorHandlerReturn => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [isServerError, setIsServerError] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);

  const handleError = useCallback((error: AxiosError | unknown) => {
    setIsNetworkError(false);
    setIsTimeoutError(false);
    setIsServerError(false);
    setIsAuthError(false);

    if (error && isAxiosError(error)) {

      // Handle network errors
      if (error.code === "ERR_NETWORK") {
        setIsNetworkError(true);
        setErrorMessage(
          "Network error: Unable to reach the server. Please check your connection or try again later."
        );
      }
      // Handle timeout errors
      else if (error.code === "ECONNABORTED") {
        setIsTimeoutError(true);
        setErrorMessage(
          "Request timeout: Server is taking too long to respond. Please try again."
        );
      }
      // Handle server errors (5xx)
      else if (error.response?.status && error.response.status >= 500) {
        setIsServerError(true);
        setErrorMessage(
          "Server error: The server is temporarily unavailable. Please try again later."
        );
      }
      // Handle authentication errors
      else if (error.response?.status === 401) {
        setIsAuthError(true);
        setErrorMessage("Session expired. Please log in again.");
      }
      // Handle validation errors
      else if (error.response?.status === 400) {
        setIsAuthError(true);
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
        setIsNetworkError(true);
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
    setIsNetworkError(false);
    setIsTimeoutError(false);
    setIsServerError(false);
    setIsAuthError(false);
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
