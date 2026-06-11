const { EventEmitter, NotificationService } = require('../../src/utils/notificationService');

describe('EventEmitter', () => {
  let emitter;
  beforeEach(() => { emitter = new EventEmitter(); });

  test('on + emit calls listener', () => {
    const fn = jest.fn();
    emitter.on('test', fn);
    emitter.emit('test', { data: 1 });
    expect(fn).toHaveBeenCalledWith({ data: 1 });
  });

  test('multiple listeners called', () => {
    const fn1 = jest.fn(), fn2 = jest.fn();
    emitter.on('x', fn1); emitter.on('x', fn2);
    emitter.emit('x', 'val');
    expect(fn1).toHaveBeenCalled(); expect(fn2).toHaveBeenCalled();
  });

  test('off removes listener', () => {
    const fn = jest.fn();
    emitter.on('test', fn);
    emitter.off('test', fn);
    emitter.emit('test', {});
    expect(fn).not.toHaveBeenCalled();
  });

  test('on returns unsubscribe fn', () => {
    const fn = jest.fn();
    const unsub = emitter.on('test', fn);
    unsub();
    emitter.emit('test', {});
    expect(fn).not.toHaveBeenCalled();
  });

  test('emit with no listeners does not throw', () => { expect(() => emitter.emit('none', {})).not.toThrow(); });

  test('throws for non-function listener', () => { expect(() => emitter.on('x', 'not-a-fn')).toThrow('must be a function'); });

  test('listener error does not crash others', () => {
    const bad = () => { throw new Error('boom'); };
    const good = jest.fn();
    emitter.on('ev', bad);
    emitter.on('ev', good);
    expect(() => emitter.emit('ev', {})).not.toThrow();
    expect(good).toHaveBeenCalled();
  });

  test('getHistory records events', () => {
    emitter.emit('a', 1); emitter.emit('b', 2);
    expect(emitter.getHistory().length).toBe(2);
  });

  test('getHistory filtered by event', () => {
    emitter.emit('a', 1); emitter.emit('b', 2); emitter.emit('a', 3);
    expect(emitter.getHistory('a').length).toBe(2);
  });

  test('clearHistory empties list', () => {
    emitter.emit('x', 1); emitter.clearHistory();
    expect(emitter.getHistory().length).toBe(0);
  });

  test('listenerCount', () => {
    emitter.on('x', jest.fn()); emitter.on('x', jest.fn());
    expect(emitter.listenerCount('x')).toBe(2);
  });

  test('listenerCount 0 for unknown event', () => { expect(emitter.listenerCount('unknown')).toBe(0); });

  test('off on unknown event does not throw', () => { expect(() => emitter.off('nope', jest.fn())).not.toThrow(); });
});

describe('NotificationService', () => {
  let ns;
  beforeEach(() => { ns = new NotificationService(); });

  test('notify creates notification', () => {
    const n = ns.notify('u1', 'Hello', 'info');
    expect(n.userId).toBe('u1');
    expect(n.message).toBe('Hello');
    expect(n.type).toBe('info');
    expect(n.read).toBe(false);
  });

  test('notify emits notification event', () => {
    const fn = jest.fn();
    ns.on('notification', fn);
    ns.notify('u1', 'test');
    expect(fn).toHaveBeenCalled();
  });

  test('getForUser returns only user notifications', () => {
    ns.notify('u1', 'a'); ns.notify('u2', 'b'); ns.notify('u1', 'c');
    expect(ns.getForUser('u1').length).toBe(2);
  });

  test('getUnread filters read', () => {
    const n = ns.notify('u1', 'msg');
    ns.markRead(n.id);
    expect(ns.getUnread('u1').length).toBe(0);
  });

  test('markRead sets read=true', () => {
    const n = ns.notify('u1', 'msg');
    ns.markRead(n.id);
    expect(ns.getForUser('u1')[0].read).toBe(true);
  });

  test('markRead throws for unknown id', () => { expect(() => ns.markRead('bad_id')).toThrow('not found'); });

  test('markAllRead marks all for user', () => {
    ns.notify('u1', 'a'); ns.notify('u1', 'b');
    ns.markAllRead('u1');
    expect(ns.getUnread('u1').length).toBe(0);
  });

  test('markAllRead only affects target user', () => {
    ns.notify('u1', 'a'); ns.notify('u2', 'b');
    ns.markAllRead('u1');
    expect(ns.getUnread('u2').length).toBe(1);
  });

  test('clearForUser removes all notifications', () => {
    ns.notify('u1', 'a'); ns.notify('u1', 'b');
    ns.clearForUser('u1');
    expect(ns.getForUser('u1').length).toBe(0);
  });

  test('clearForUser does not remove others', () => {
    ns.notify('u1', 'a'); ns.notify('u2', 'b');
    ns.clearForUser('u1');
    expect(ns.getForUser('u2').length).toBe(1);
  });

  test('allNotifications returns all', () => {
    ns.notify('u1', 'a'); ns.notify('u2', 'b');
    expect(ns.allNotifications().length).toBe(2);
  });

  test('notification has unique id', () => {
    const n1 = ns.notify('u1', 'a'); const n2 = ns.notify('u1', 'b');
    expect(n1.id).not.toBe(n2.id);
  });
});
