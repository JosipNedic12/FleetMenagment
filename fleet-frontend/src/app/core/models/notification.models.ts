export interface Notification {
  notificationId: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}
