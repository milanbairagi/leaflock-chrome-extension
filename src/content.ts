/// <reference types="chrome"/>
import type { VaultItem } from "./types";

/**
 * Find all input fields on the page
 */

type InputFieldValue = {
  username?: string;
  password?: string;
  email?: string;
  [key: string]: string | undefined;
};


type InputField = {
  username: HTMLInputElement[];
  password: HTMLInputElement[];
  email: HTMLInputElement[];
  other: HTMLInputElement[];
}

type PendingSavePrompt = {
  vaultItem: VaultItem;
  createdAt: number;
};

const SAVE_PROMPT_CONTAINER_ID = "leaflock-save-prompt-container";
const SAVE_PROMPT_TTL_MS = 5 * 60 * 1000;

let isSubmitListenerAttached = false;

const getPendingSavePrompt = async () => {
  const response = await chrome.runtime.sendMessage({
    type: "GET_PENDING_SAVE_PROMPT",
  });

  return response as { success?: boolean; data?: PendingSavePrompt | null };
};

const setPendingSavePrompt = async (pendingSavePrompt: PendingSavePrompt) => {
  const response = await chrome.runtime.sendMessage({
    type: "SET_PENDING_SAVE_PROMPT",
    payload: { pendingSavePrompt },
  });

  return response as { success?: boolean };
};

const removePendingSavePrompt = async () => {
  const response = await chrome.runtime.sendMessage({
    type: "REMOVE_PENDING_SAVE_PROMPT",
  });

  return response as { success?: boolean };
};

const getFirstNonEmptyValue = (fields: HTMLInputElement[]) => {
  return fields.map((field) => field.value.trim()).find((value) => value.length > 0) || "";
};

const buildVaultItemFromFields = (fields: InputField): VaultItem | null => {
  const username = getFirstNonEmptyValue(fields.username) || getFirstNonEmptyValue(fields.email);
  const password = getFirstNonEmptyValue(fields.password);

  if (!username || !password) {
    return null;
  }

  const email = getFirstNonEmptyValue(fields.email);
  const title = document.title.trim() || new URL(window.location.href).hostname;

  return {
    id: "",
    title,
    username,
    password,
    url: window.location.href,
    extra_fields: email && email !== username ? [{ title: "Email", value: email }] : [],
    notes: "",
    is_deleted: false,
    created_at: "",
    updated_at: "",
  };
};

const removeSavePrompt = async () => {
  const existing = document.getElementById(SAVE_PROMPT_CONTAINER_ID);
  if (existing) {
    existing.remove();
  }

  await removePendingSavePrompt();
};

const renderSavePrompt = async (vaultItem: VaultItem) => {
  const existing = document.getElementById(SAVE_PROMPT_CONTAINER_ID);
  if (existing) {
    existing.remove();
  }

  const container = document.createElement("div");
  container.id = SAVE_PROMPT_CONTAINER_ID;
  container.style.position = "fixed";
  container.style.top = "16px";
  container.style.right = "16px";
  container.style.zIndex = "2147483647";
  container.style.width = "320px";
  container.style.maxWidth = "calc(100vw - 32px)";

  const shadow = container.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    .leaflock-save-card {
      background: #1f2328;
      border: 1px solid #4f5b66;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
      padding: 14px;
      color: #f2f4f7;
      font-family: inherit;
    }

    .leaflock-save-title {
      margin: 0 0 6px;
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }

    .leaflock-save-subtitle {
      margin: 0 0 12px;
      font-size: 12px;
      color: #c0c6cc;
      word-break: break-word;
    }

    .leaflock-save-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .leaflock-save-button {
      border: 0;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      cursor: pointer;
    }

    .leaflock-save-button.primary {
      background: #7cb66c;
      color: #fff;
    }

    .leaflock-save-button.secondary {
      background: #2d333b;
      color: #d7dde3;
    }
  `;

  const card = document.createElement("div");
  card.className = "leaflock-save-card";

  const title = document.createElement("p");
  title.className = "leaflock-save-title";
  title.textContent = `Save login for ${new URL(vaultItem.url).hostname}?`;

  const subtitle = document.createElement("p");
  subtitle.className = "leaflock-save-subtitle";
  subtitle.textContent = vaultItem.username;

  const actions = document.createElement("div");
  actions.className = "leaflock-save-actions";

  const dismissButton = document.createElement("button");
  dismissButton.className = "leaflock-save-button secondary";
  dismissButton.type = "button";
  dismissButton.textContent = "Not now";
  dismissButton.addEventListener("click", () => {
    void removeSavePrompt();
  });

  const saveButton = document.createElement("button");
  saveButton.className = "leaflock-save-button primary";
  saveButton.type = "button";
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", async () => {
    try {
      const response = await addNewVaultItem(vaultItem);
      if (!response?.success) {
        console.warn("[Content Script] Failed to save vault item:", response?.error);
        return;
      }

      await removeSavePrompt();
      console.log("[Content Script] Saved new vault item from prompt");
    } catch (error) {
      console.warn("[Content Script] Error saving vault item:", error);
    }
  });

  actions.appendChild(dismissButton);
  actions.appendChild(saveButton);
  card.appendChild(title);
  card.appendChild(subtitle);
  card.appendChild(actions);

  shadow.appendChild(style);
  shadow.appendChild(card);
  document.body.appendChild(container);
};

const maybeShowPendingSavePrompt = async () => {
  const response = await getPendingSavePrompt();
  const pending = response.data;

  if (!pending?.vaultItem || typeof pending.createdAt !== "number") {
    return;
  }

  if (Date.now() - pending.createdAt > SAVE_PROMPT_TTL_MS) {
    await removePendingSavePrompt();
    return;
  }

  const unlockResponse = await chrome.runtime.sendMessage({ type: "HAS_UNLOCK_KEY" });
  if (!unlockResponse?.success) {
    return;
  }

  await renderSavePrompt(pending.vaultItem);
};

const maybeQueueSavePrompt = async (vaultItem: VaultItem) => {
  await setPendingSavePrompt({
    vaultItem,
    createdAt: Date.now(),
  });

  await renderSavePrompt(vaultItem);
};

function findInputFields() {
  const fields: InputField = {
    username: [],
    password: [],
    email: [],
    other: [],
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

function findInputFieldsInForm(form: HTMLFormElement) {
  const fields: InputField = {
    username: [],
    password: [],
    email: [],
    other: [],
  };

  const inputs = form.querySelectorAll("input");

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

const addNewVaultItem = async (vaultItem: VaultItem) => {
  return chrome.runtime.sendMessage({
    type: "ADD_NEW_VAULT_ITEM",
    payload: { vaultItem },
  });
};

const handleFormSubmit = async (event: SubmitEvent) => {
  const form = event.target;

  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  const fields = findInputFieldsInForm(form);
  const vaultItem = buildVaultItemFromFields(fields);

  if (!vaultItem) {
    return;
  }

  const unlockResponse = await chrome.runtime.sendMessage({ type: "HAS_UNLOCK_KEY" });
  if (!unlockResponse?.success) {
    return;
  }

  const existingItemsResponse = await chrome.runtime.sendMessage({
    type: "GET_VAULT_ITEMS_FOR_URL",
    payload: { url: window.location.href },
  });

  if (existingItemsResponse?.success && Array.isArray(existingItemsResponse.items) && existingItemsResponse.items.length > 0) {
    return;
  }

  await maybeQueueSavePrompt(vaultItem);
};

const attachSavePromptListener = () => {
  if (isSubmitListenerAttached) {
    return;
  }

  document.addEventListener("submit", (event) => {
    void handleFormSubmit(event);
  }, true);

  isSubmitListenerAttached = true;
};

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
    return true;

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
    return true;
  }
  
  else if (message.type === "VAULT_STATUS") {
    if (!message.payload || typeof message.payload != "string") {
      throw new Error("Invalid payload for VAULT_STATUS message");
    }
    if (message.payload === "unlock") await handleAutofill();
    sendResponse({ success: true });
    return true;
  }

  sendResponse({ success: false, error: "Unknown message type" });
  return true;
});

const fillInputField = (values: VaultItem, fields: InputField) => {
  // Fill username
  if (values.username && fields.username.length > 0) {
    fields.username[0].value = values.username;
  }
  // Fill password
  if (values.password && fields.password.length > 0) {
    fields.password[0].value = values.password;
  }
  // Fill email
  // if (values.email && fields.email.length > 0) {
  //   fields.email[0].value = values.email;
  // }
};

const showAutofillOptions = (vaultItems: VaultItem[], inputFields: InputField) => {
  // Inline CSS for Shadow DOM (avoids fetch() permission issues)
  const CSS_CONTENT = `
    .leaflock-autofill-panel {
      background: #424345;
      border: 1px solid #555658;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-height: 240px;
      overflow-y: auto;
      padding: 4px;
    }

    .leaflock-autofill-dropdown {
      display: grid;
      gap: 4px;
    }
    
    .leaflock-autofill-option {
      border: 1px solid #555658;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 3px;
      transition: background-color 0.2s;
      background: #343536;
    }
    
    .leaflock-autofill-option:hover {
      background-color: #555658;
    }
    
    .leaflock-autofill-option p {
      margin: 0;
      color: #c6c7c7;
      font-size: 14px;
    }

    .leaflock-autofill-option.leaflock-autofill-action {
      background: #2f4f4f;
      border-color: #5ba8a8;
    }

    .leaflock-autofill-option.leaflock-autofill-action:hover {
      background: #3d6f6f;
    }

    .leaflock-autofill-hint {
      color: #aeb0b2;
      font-size: 12px;
      margin: 4px 6px 8px;
    }
  `;

  const removeDropdown = () => {
    const existing = document.querySelector('#leaflock-autofill-container');
    if (existing) existing.remove();
  };

  const addEventListeners = (fields: HTMLInputElement[]) => {
    fields.forEach((field) => {
      field.addEventListener("focus", () => handleFocus(field));
      field.parentElement?.classList.add("leaflock-autofill-target");
    });
  };

  const handleClickOptions = (values: VaultItem) => {
    removeDropdown();
    fillInputField(values, inputFields);
  };

  const handleFocus = async (field: HTMLInputElement) => {
    // Remove any existing dropdown
    removeDropdown();

    // Create container with shadow DOM
    const container = document.createElement('div');
    container.id = 'leaflock-autofill-container';
    
    // Apply positioning styles directly to container
    container.style.position = 'absolute';
    container.style.zIndex = '999999';
    
    // Attach shadow root for complete isolation
    const shadow = container.attachShadow({ mode: 'closed' });
    
    // Load CSS into shadow DOM
    const style = document.createElement('style');
    style.textContent = CSS_CONTENT;
    shadow.appendChild(style);
    
    // Create dropdown
    const panel = document.createElement('div');
    panel.className = 'leaflock-autofill-panel';

    const dropdown = document.createElement('div');
    dropdown.className = 'leaflock-autofill-dropdown';

    if (vaultItems.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'leaflock-autofill-hint';
      hint.textContent = 'No saved login found for this site.';
      panel.appendChild(hint);
    }
    
    vaultItems.forEach(item => {
      const option = document.createElement('div');
      option.className = 'leaflock-autofill-option';
      
      const text = document.createElement('p');
      text.textContent = item.username;
      option.appendChild(text);
      
      option.addEventListener('click', () => handleClickOptions(item));
      
      dropdown.appendChild(option);
    });

    panel.appendChild(dropdown);
    
    shadow.appendChild(panel);
    document.body.appendChild(container);
    
    // Position relative to input field
    const rect = field.getBoundingClientRect();
    container.style.top = `${rect.bottom + window.scrollY}px`;
    container.style.left = `${rect.left + window.scrollX}px`;
    container.style.width = `${rect.width}px`;
  };

  // Remove dropdown on click outside
  const handleClickOutside = (e: MouseEvent) => {
    const container = document.querySelector('#leaflock-autofill-container');
    if (container && !container.contains(e.target as Node)) {
      const target = e.target as HTMLElement;
      // Check if click is on an input field we're monitoring
      const isInputField = 
        inputFields.username.includes(target as HTMLInputElement) ||
        inputFields.password.includes(target as HTMLInputElement) ||
        inputFields.email.includes(target as HTMLInputElement);
      
      if (!isInputField) {
        removeDropdown();
      }
    }
  };

  document.addEventListener('click', handleClickOutside);

  addEventListeners(inputFields.username);
  addEventListeners(inputFields.password);
  addEventListeners(inputFields.email);
};

/*
  * Handle autofill by finding input fields and requesting vault items from background
  * Then show autofill options
  */
const handleAutofill = async () => {
  const fields = findInputFields();
  
  if (fields.username.length > 0 || fields.password.length > 0 || fields.email.length > 0) {
    const vaultItems: VaultItem[] = [];
    console.log("[Content Script] Found input fields, requesting vault items for autofill...");
    console.log(fields);

    const res = await chrome.runtime.sendMessage({
      type: "GET_VAULT_ITEMS_FOR_URL",
      payload: {
        url: window.location.href,
      }
    });
    
    if (res && res.success && res.items) {
      vaultItems.push(...res.items);
    }
    showAutofillOptions(vaultItems, fields);
  }
};

// On load, check for input fields and expect vault items from background
(async () => {
  attachSavePromptListener();
  await handleAutofill();
  await maybeShowPendingSavePrompt();
})();