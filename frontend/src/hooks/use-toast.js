import { useState, useCallback } from 'react';

const toasts = [];
let toastId = 0;

export const useToast = () => {
  const [, forceUpdate] = useState({});

  const toast = useCallback(({ title, description, variant = 'default', duration = 5000 }) => {
    const id = toastId++;
    const newToast = {
      id,
      title,
      description,
      variant,
      duration,
      createdAt: Date.now(),
    };

    toasts.push(newToast);
    forceUpdate({});

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        const index = toasts.findIndex(t => t.id === id);
        if (index > -1) {
          toasts.splice(index, 1);
          forceUpdate({});
        }
      }, duration);
    }

    return {
      id,
      dismiss: () => {
        const index = toasts.findIndex(t => t.id === id);
        if (index > -1) {
          toasts.splice(index, 1);
          forceUpdate({});
        }
      },
    };
  }, []);

  return {
    toast,
    toasts,
    dismiss: (toastId) => {
      const index = toasts.findIndex(t => t.id === toastId);
      if (index > -1) {
        toasts.splice(index, 1);
        forceUpdate({});
      }
    },
  };
};

