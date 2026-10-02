import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { installCompanyFetch } from '@/lib/company'

installCompanyFetch();

createRoot(document.getElementById("root")!).render(<App />);
