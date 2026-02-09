type ContentMessage = {
  type: string;
  payload?: unknown;
};

type ContentResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};
// 
export const sendMessageToContent = async (
  message: ContentMessage,
): Promise<ContentResponse | null> => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.id) return null;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response;
  } catch (error) {
    // Handle "Receiving end does not exist" error
    if (error instanceof Error && error.message.includes("Receiving end does not exist")) {
      console.warn("[LeafLock] Content script not ready or tab closed");
      return { success: false, error: "Content script not available" };
    }
    // Handle other errors
    console.error("[LeafLock] Failed to send message to content script:", error);
    return { success: false, error: "Failed to communicate with page" };
  }
};
