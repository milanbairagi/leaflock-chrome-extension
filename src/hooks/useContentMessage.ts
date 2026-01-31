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

  const response = await chrome.tabs.sendMessage(tab.id, message);
  return response;
};
