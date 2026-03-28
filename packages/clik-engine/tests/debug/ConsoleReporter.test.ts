import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleReporter, ClikLogChannel } from '../../src/debug/ConsoleReporter';

describe('ConsoleReporter', () => {
  beforeEach(() => {
    ConsoleReporter.enable();
    // Re-enable all channels
    for (const ch of Object.values(ClikLogChannel)) {
      ConsoleReporter.enableChannel(ch);
    }
  });

  it('logs to console when enabled', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    ConsoleReporter.engine('test message');
    expect(spy).toHaveBeenCalledWith('[CLIK:ENGINE]', 'test message');
    spy.mockRestore();
  });

  it('does not log when disabled', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    ConsoleReporter.disable();
    ConsoleReporter.engine('should not appear');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    ConsoleReporter.enable();
  });

  it('can disable individual channels', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    ConsoleReporter.disableChannel(ClikLogChannel.INPUT);
    ConsoleReporter.input('should be filtered');
    ConsoleReporter.engine('should appear');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('[CLIK:ENGINE]', 'should appear');
    spy.mockRestore();
  });

  it('errors always log regardless of channel filter', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ConsoleReporter.disableChannel(ClikLogChannel.ERROR);
    ConsoleReporter.error('critical error');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('checks channel enabled state', () => {
    expect(ConsoleReporter.isChannelEnabled(ClikLogChannel.SCENE)).toBe(true);
    ConsoleReporter.disableChannel(ClikLogChannel.SCENE);
    expect(ConsoleReporter.isChannelEnabled(ClikLogChannel.SCENE)).toBe(false);
    ConsoleReporter.enableChannel(ClikLogChannel.SCENE);
    expect(ConsoleReporter.isChannelEnabled(ClikLogChannel.SCENE)).toBe(true);
  });

  it('can set multiple channels at once', () => {
    ConsoleReporter.setChannels([ClikLogChannel.INPUT, ClikLogChannel.AUDIO], false);
    expect(ConsoleReporter.isChannelEnabled(ClikLogChannel.INPUT)).toBe(false);
    expect(ConsoleReporter.isChannelEnabled(ClikLogChannel.AUDIO)).toBe(false);
    expect(ConsoleReporter.isChannelEnabled(ClikLogChannel.SCENE)).toBe(true);
  });

  it('logs with data', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    ConsoleReporter.state('test', { hp: 100 });
    expect(spy).toHaveBeenCalledWith('[CLIK:STATE]', 'test', { hp: 100 });
    spy.mockRestore();
  });

  it('error logs suggestion', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    ConsoleReporter.error('broken', 'try fixing it');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith('[CLIK:ERROR]', 'broken');
    expect(spy).toHaveBeenCalledWith('[CLIK:ERROR]', 'Suggestion: try fixing it');
    spy.mockRestore();
  });
});
