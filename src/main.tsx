import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { EnvironmentProvider } from './contexts/EnvironmentContext.tsx';
import { UserProvider } from './contexts/UserContext.tsx';

createRoot(document.getElementById("root")!).render(
  <UserProvider>
    <EnvironmentProvider>
      <App />
    </EnvironmentProvider>
  </UserProvider>
);
