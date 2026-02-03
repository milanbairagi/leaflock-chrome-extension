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

type InputField = {
  username: HTMLInputElement[];
  password: HTMLInputElement[];
  email: HTMLInputElement[];
  other: HTMLInputElement[];
}

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

const showAutofillOptions = (vaultItems: VaultItem[], inputFields: InputField) => {
  // Inline CSS for Shadow DOM (avoids fetch() permission issues)
  const CSS_CONTENT = `
    #leaflock-autofill-container {
      position: absolute;
      z-index: 2147483647;
    }
    
    .leaflock-autofill-dropdown {
      background: #424345;
      border: 1px solid #555658;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      max-height: 200px;
      overflow-y: auto;
      margin-top: 2px;
    }
    
    .leaflock-autofill-option {
      border: 1px solid #555658;
      padding: 8px 12px;
      margin: 4px;
      cursor: pointer;
      border-radius: 3px;
      transition: background-color 0.2s;
    }
    
    .leaflock-autofill-option:hover {
      background-color: #555658;
    }
    
    .leaflock-autofill-option p {
      margin: 0;
      color: #c6c7c7;
      font-size: 14px;
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

  const handleFocus = async (field: HTMLInputElement) => {
    // Remove any existing dropdown
    removeDropdown();

    // Create container with shadow DOM
    const container = document.createElement('div');
    container.id = 'leaflock-autofill-container';
    
    // Attach shadow root for complete isolation
    const shadow = container.attachShadow({ mode: 'closed' });
    
    // Load CSS into shadow DOM
    const style = document.createElement('style');
    style.textContent = CSS_CONTENT;
    shadow.appendChild(style);
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'leaflock-autofill-dropdown';
    
    vaultItems.forEach(item => {
      const option = document.createElement('div');
      option.className = 'leaflock-autofill-option';
      
      const text = document.createElement('p');
      text.textContent = item.username;
      option.appendChild(text);
      
      option.addEventListener('click', async () => {        
        removeDropdown();
      });
      
      dropdown.appendChild(option);
    });
    
    shadow.appendChild(dropdown);
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
    console.log("[LeafLock] Detected input fields:", fields);
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
    console.log(vaultItems);
    showAutofillOptions(vaultItems, fields);
  }
};

// On load, check for input fields and expect vault items from background
(async () => {
  await handleAutofill();
})();