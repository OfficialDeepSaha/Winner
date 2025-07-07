import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const Toast = ({ toast, onDismiss }) => {
  const getIcon = () => {
    switch (toast.variant) {
      case 'destructive':
        return <AlertCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariantClasses = () => {
    switch (toast.variant) {
      case 'destructive':
        return 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-50';
      case 'success':
        return 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-50';
    }
  };

  return (
    <div className={`relative rounded-lg border p-4 shadow-lg ${getVariantClasses()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <div className="font-medium text-sm mb-1">
              {toast.title}
            </div>
          )}
          {toast.description && (
            <div className="text-sm opacity-90">
              {toast.description}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-transparent"
          onClick={() => onDismiss(toast.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 z-50 w-full max-w-sm p-4 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
};

