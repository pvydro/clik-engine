import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';

describe('EventBus', () => {
  it('emits events to listeners', () => {
    const bus = new EventBus();
    const cb = vi.fn();
    bus.on('test', cb);
    bus.emit('test', 'hello');
    expect(cb).toHaveBeenCalledWith('hello');
  });

  it('supports multiple listeners', () => {
    const bus = new EventBus();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    bus.on('e', cb1).on('e', cb2);
    bus.emit('e');
    expect(cb1).toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

  it('once listeners fire only once', () => {
    const bus = new EventBus();
    const cb = vi.fn();
    bus.once('one', cb);
    bus.emit('one');
    bus.emit('one');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('off removes a listener', () => {
    const bus = new EventBus();
    const cb = vi.fn();
    bus.on('test', cb);
    bus.off('test', cb);
    bus.emit('test');
    expect(cb).not.toHaveBeenCalled();
  });

  it('removeAll clears all listeners for an event', () => {
    const bus = new EventBus();
    bus.on('x', vi.fn());
    bus.on('x', vi.fn());
    bus.removeAll('x');
    expect(bus.hasListeners('x')).toBe(false);
  });

  it('clear removes everything', () => {
    const bus = new EventBus();
    bus.on('a', vi.fn());
    bus.on('b', vi.fn());
    bus.clear();
    expect(bus.hasListeners('a')).toBe(false);
    expect(bus.hasListeners('b')).toBe(false);
  });

  it('passes multiple arguments', () => {
    const bus = new EventBus();
    const cb = vi.fn();
    bus.on('multi', cb);
    bus.emit('multi', 1, 'two', { three: 3 });
    expect(cb).toHaveBeenCalledWith(1, 'two', { three: 3 });
  });

  it('counts listeners', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('empty')).toBe(0);
    bus.on('test', vi.fn());
    bus.on('test', vi.fn());
    bus.once('test', vi.fn());
    expect(bus.listenerCount('test')).toBe(3);
  });

  it('does not error when emitting with no listeners', () => {
    const bus = new EventBus();
    expect(() => bus.emit('nothing')).not.toThrow();
  });
});
