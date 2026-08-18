import { createRoot } from 'react-dom/client';
import { Toaster, toast as sonner } from 'sonner';

const host = document.getElementById('toast-wrap');
if (host) {
  createRoot(host).render(
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={3200}
      visibleToasts={4}
      toastOptions={{
        style: {
          fontFamily: "var(--font-body, 'Be Vietnam Pro', system-ui, sans-serif)",
        },
      }}
    />,
  );
}

export function notify(message, type = '') {
  if (type === 'ok' || type === 'success') return sonner.success(message);
  if (type === 'err' || type === 'error') return sonner.error(message);
  if (type === 'warning' || type === 'warn') return sonner.warning(message);
  if (type === 'info') return sonner.info(message);
  return sonner(message);
}
