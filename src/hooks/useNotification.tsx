import { useState, useCallback } from 'react';
import Notification from '../components/Notification';

interface NotificationConfig {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationConfig | null>(null);

  const showNotification = useCallback((config: NotificationConfig) => {
    setNotification(config);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const NotificationComponent = notification ? (
    <Notification
      message={notification.message}
      type={notification.type}
      onClose={hideNotification}
      duration={notification.duration}
    />
  ) : null;

  return {
    showNotification,
    hideNotification,
    NotificationComponent
  };
}
