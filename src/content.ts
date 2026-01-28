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
}

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
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
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

  sendResponse({ success: false, error: "Unknown message type" });
  return true;
});
