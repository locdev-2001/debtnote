import { createRoot } from 'react-dom/client';
import { DesignPage } from './design-page';
import './visual-kit.css';

const designRoot = document.getElementById('design-root');
if (designRoot) createRoot(designRoot).render(<DesignPage />);
