import { useContext } from 'react';
import { NotificationsContext } from '@/context/NotificationsContext';
export type { NotificationItem, NotificationTab } from '@/context/NotificationsContext';

export function useNotificationsLogic() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotificationsLogic must be used within a NotificationsProvider');
  }
  return context;
}
