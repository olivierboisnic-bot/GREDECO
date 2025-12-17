import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function Notification({
  message,
  type = 'info',
  onClose,
  autoClose = true,
  duration = 4000
}: NotificationProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  }[type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800'
  }[type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info
  }[type];

  const iconColor = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600'
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div className={`${bgColor} ${textColor} border rounded-lg shadow-lg p-4 flex items-start gap-3`}>
        <Icon size={20} className={`${iconColor} flex-shrink-0 mt-0.5`} />
        <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
