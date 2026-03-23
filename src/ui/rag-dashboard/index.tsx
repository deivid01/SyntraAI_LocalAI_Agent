import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('rag-dashboard-root');
if (container) {
  try {
    console.log('[Synapse] Iniciando Root do Dashboard...');
    if ((window as any).addLog) (window as any).addLog('info', 'Iniciando Dashboard React...', 'Synapse');
    const root = createRoot(container);
    root.render(<App />);
    console.log('[Synapse] Renderização do App disparada.');
    if ((window as any).addLog) (window as any).addLog('success', 'Dashboard React montado.', 'Synapse');
  } catch (e: any) {
    console.error('[Synapse] Falha crítica na renderização React:', e);
    if ((window as any).addLog) (window as any).addLog('error', `Falha React: ${e.message}`, 'Synapse');
  }
} else {
  console.error('[Synapse] Erro fatal: Elemento #rag-dashboard-root não encontrado!');
  if ((window as any).addLog) (window as any).addLog('error', 'Root do Dashboard não encontrado!', 'Synapse');
}
