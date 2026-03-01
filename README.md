# LeafLock

A secure password manager Chrome extension built with React, TypeScript, and Vite. LeafLock helps you securely store, manage, and access your passwords directly from your browser.

## ✨ Features

- **🔒 Secure Password Storage**: Store your passwords securely in encrypted vaults
- **🔐 Vault Lock/Unlock**: Double-layer security with master password protection
- **➕ Add & Edit Passwords**: Easy interface to add new passwords and edit existing ones
- **👁️ Password Details View**: View detailed information about stored credentials
- **🔑 User Authentication**: JWT-based authentication with access and refresh tokens
- **⚡ Fast & Responsive**: Built with React 19 and Vite for optimal performance
- **🎨 Modern UI**: Styled with Tailwind CSS 4 for a clean, modern interface

## 🛠️ Tech Stack

- **Frontend Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS 4.1.18
- **HTTP Client**: Axios 1.13.2
- **Authentication**: JWT (jwt-decode)
- **Chrome APIs**: Storage, Tabs, ActiveTab, Alarms

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Chrome browser

## 🚀 Installation

### For Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/milanbairagi/leaflock-chrome-extension.git
   cd leaflock-chrome-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the root directory and add the following:
      ```
      VITE_API_BASE_URL=http://localhost:8000/  # Replace with your backend API URL
      ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load the extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from the project directory

### For Production

Download the extension from the Chrome Web Store (_coming soon_).

## 🧑‍💻 Development

### Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the extension for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview the production build

### Development Workflow

1. After making changes, rebuild the extension:
   ```bash
   npm run build
   ```

2. Go to `chrome://extensions/` and click the refresh icon on the LeafLock extension

## 📁 Project Structure

```
leaflock-chrome-extension/
├── public/
│   └── manifest.json                # Chrome extension manifest
├── src/
│   ├── assets/                      # Images and icons
│   ├── components/                  # Reusable React components
│   │   ├── buttons/
│   │   └── inputs/
│   ├── contexts/                    # React Context providers
│   │   ├── useAuthCredential.tsx
│   │   └── useUser.tsx
│   ├── pages/                       # Application pages
│   │   ├── AddNewPage.tsx
│   │   ├── EditPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── PasswordDetailPage.tsx
│   │   └── VaultUnlockPage.tsx
│   ├── App.tsx                      # Main application component
│   ├── axios.ts                     # Axios configuration
│   ├── background.ts                # Background service worker
│   └── main.tsx                     # Application entry point
├── index.html                       # Extension popup HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🔐 Security

- All passwords are encrypted before storage
- JWT-based authentication with refresh token mechanism
- Vault unlock mechanism provides an additional layer of security
- Tokens are stored securely using Chrome's storage API

## 🌐 Backend

LeafLock requires a backend server to function. The backend repository can be found here:
- [Backend Repository](https://github.com/milanbairagi/LockLeaf)


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Milan Bairagi**
- GitHub: [@milanbairagi](https://github.com/milanbairagi)
- Backend: [LockLeaf](https://github.com/milanbairagi/LockLeaf)

