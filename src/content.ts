/// <reference types="chrome"/>

/**
 * Find all input fields on the page
 */

console.log("Content script loaded");

type InputFieldValue = {
  username?: string;
  password?: string;
  email?: string;
  [key: string]: string | undefined;
};

type VaultItem = {
  id: number;
  title: string;
  username: string;
  url: string;
  created_at: string;
  updated_at: string;
};

function findInputFields() {
  const fields = {
    username: [] as HTMLInputElement[],
    password: [] as HTMLInputElement[],
    email: [] as HTMLInputElement[],
    other: [] as HTMLInputElement[],
  };

  // Find all input elements
  const inputs = document.querySelectorAll("input");

  inputs.forEach((input) => {
    const type = input.type.toLowerCase();
    const name = input.name.toLowerCase();
    const id = input.id.toLowerCase();
    const placeholder = input.placeholder.toLowerCase();

    if (type === "password") {
      fields.password.push(input);
    } else if (
      type === "email" ||
      name.includes("email") ||
      id.includes("email")
    ) {
      fields.email.push(input);
    } else if (
      name.includes("user") ||
      name.includes("login") ||
      id.includes("user") ||
      id.includes("login") ||
      placeholder.includes("user") ||
      placeholder.includes("login")
    ) {
      fields.username.push(input);
    } else if (type === "text" || type === "") {
      fields.other.push(input);
    }
  });

  return fields;
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
  if (message.type === "FIND_INPUT_FIELDS") {
    const fields = findInputFields();
    sendResponse({
      success: true,
      fields: {
        username: fields.username.length,
        password: fields.password.length,
        email: fields.email.length,
        other: fields.other.length,
      },
    });

  } 
  // Handle setting input field values
  else if (message.type === "SET_INPUT_FIELD_VALUES") {
    const { values }: { values: InputFieldValue } = message.payload;
    const fields = findInputFields();

    // Fill username
    if (values.username && fields.username.length > 0) {
      fields.username[0].value = values.username;
    }
    // Fill password
    if (values.password && fields.password.length > 0) {
      fields.password[0].value = values.password;
    }
    // Fill email
    if (values.email && fields.email.length > 0) {
      fields.email[0].value = values.email;
    }

    sendResponse({ success: true });
  }
  else if (message.type === "RESET_INPUT_FIELDS") {
    await handleAutofill();
    sendResponse({ success: true });
  }

  sendResponse({ success: false, error: "Unknown message type" });
  return true;
});

const showAutofillOptions = (vaultItems: VaultItem[]) => {
  // For simplicity, just log the items for now
  console.log("Autofill options available:", vaultItems);
};

const handleAutofill = async () => {
  const fields = findInputFields();
  
  if (fields.username.length > 0 || fields.password.length > 0 || fields.email.length > 0) {
    console.log("[LeafLock] Detected input fields:");
    const vaultItems: VaultItem[] = [];

    const res = await chrome.runtime.sendMessage({
      type: "GET_VAULT_ITEMS_FOR_URL",
      payload: {
        url: window.location.href
      }
    });

    if (res && res.success && res.items) {
      vaultItems.push(...res.items);
    }
    showAutofillOptions(vaultItems);
  }
};

// On load, check for input fields and expect vault items from background
(async () => {
  await handleAutofill();
})();