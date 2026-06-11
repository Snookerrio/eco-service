// Observer Pattern (GoF) — сповіщення про події у системі

class EventEmitter {
  constructor() {
    this._listeners = new Map();
    this._history = [];
  }

  on(event, listener) {
    if (typeof listener !== 'function') throw new Error('Listener must be a function');
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(listener);
    return () => this.off(event, listener); // unsubscribe function
  }

  off(event, listener) {
    if (!this._listeners.has(event)) return;
    const listeners = this._listeners.get(event).filter(l => l !== listener);
    this._listeners.set(event, listeners);
  }

  emit(event, data) {
    const record = { event, data, timestamp: new Date() };
    this._history.push(record);
    if (!this._listeners.has(event)) return;
    this._listeners.get(event).forEach(listener => {
      try {
        listener(data);
      } catch (err) {
        // Do not let one listener crash others
        console.error(`Listener error on event "${event}":`, err.message);
      }
    });
  }

  getHistory(event = null) {
    if (event) return this._history.filter(h => h.event === event);
    return [...this._history];
  }

  clearHistory() {
    this._history = [];
  }

  listenerCount(event) {
    return this._listeners.has(event) ? this._listeners.get(event).length : 0;
  }
}

// Singleton notification bus
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this._notifications = [];
  }

  notify(userId, message, type = 'info') {
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId,
      message,
      type,
      read: false,
      createdAt: new Date(),
    };
    this._notifications.push(notification);
    this.emit('notification', notification);
    return notification;
  }

  getForUser(userId) {
    return this._notifications.filter(n => n.userId === userId);
  }

  getUnread(userId) {
    return this._notifications.filter(n => n.userId === userId && !n.read);
  }

  markRead(notificationId) {
    const notif = this._notifications.find(n => n.id === notificationId);
    if (!notif) throw new Error('Notification not found');
    notif.read = true;
    return notif;
  }

  markAllRead(userId) {
    this._notifications
      .filter(n => n.userId === userId && !n.read)
      .forEach(n => (n.read = true));
  }

  clearForUser(userId) {
    this._notifications = this._notifications.filter(n => n.userId !== userId);
  }

  allNotifications() {
    return [...this._notifications];
  }
}

module.exports = { EventEmitter, NotificationService };
