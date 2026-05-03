import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useTradux } from "tradux/react";

export function Root() {
  const { isReady } = useTradux();

  if (!isReady) return <p>Loading translations...</p>;

  return (
    <StrictMode>
      <App />
    </StrictMode>
  );
}
  
createRoot(document.getElementById('root')!).render(<Root />);
