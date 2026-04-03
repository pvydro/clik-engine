import { describe, it, expect } from 'vitest';
import { InputPrediction } from '../../src/network/Prediction';

describe('InputPrediction', () => {
  it('starts with zero pending inputs', () => {
    const pred = new InputPrediction();
    expect(pred.pendingCount).toBe(0);
  });

  it('addInput tracks pending inputs', () => {
    const pred = new InputPrediction();
    pred.addInput({ seq: 0, input: { x: 1 }, predictedState: { px: 10 } });
    pred.addInput({ seq: 1, input: { x: 1 }, predictedState: { px: 20 } });
    expect(pred.pendingCount).toBe(2);
  });

  it('confirmInput removes confirmed and returns replay inputs', () => {
    const pred = new InputPrediction();
    pred.addInput({ seq: 0, input: 'a', predictedState: 's0' });
    pred.addInput({ seq: 1, input: 'b', predictedState: 's1' });
    pred.addInput({ seq: 2, input: 'c', predictedState: 's2' });

    const replay = pred.confirmInput(1, 'server_s1');
    expect(replay).toHaveLength(1); // seq 2 needs replay
    expect(replay[0].seq).toBe(2);
    expect(pred.pendingCount).toBe(1);
  });

  it('confirmInput clears all when caught up', () => {
    const pred = new InputPrediction();
    pred.addInput({ seq: 0, input: 'a', predictedState: 's0' });
    pred.addInput({ seq: 1, input: 'b', predictedState: 's1' });

    pred.confirmInput(1, 'server');
    expect(pred.pendingCount).toBe(0);
  });

  it('getCorrection reports need when inputs remain', () => {
    const pred = new InputPrediction();
    pred.addInput({ seq: 0, input: 'a', predictedState: 's0' });
    pred.addInput({ seq: 1, input: 'b', predictedState: 's1' });

    pred.confirmInput(0, 'server');
    const corr = pred.getCorrection();
    expect(corr.needsCorrection).toBe(true);
    expect(corr.replayCount).toBe(1);
    expect(corr.serverState).toBe('server');
  });

  it('getCorrection reports no need when all confirmed', () => {
    const pred = new InputPrediction();
    pred.addInput({ seq: 0, input: 'a', predictedState: 's0' });
    pred.confirmInput(0, 'server');
    const corr = pred.getCorrection();
    expect(corr.replayCount).toBe(0);
  });

  it('respects maxPendingInputs', () => {
    const pred = new InputPrediction(3);
    for (let i = 0; i < 10; i++) {
      pred.addInput({ seq: i, input: i, predictedState: i });
    }
    expect(pred.pendingCount).toBe(3);
  });

  it('lastConfirmedSequence tracks latest', () => {
    const pred = new InputPrediction();
    pred.addInput({ seq: 5, input: 'x', predictedState: 's' });
    pred.confirmInput(5, 'server');
    expect(pred.lastConfirmedSequence).toBe(5);
  });

  it('clear resets everything', () => {
    const pred = new InputPrediction();
    pred.addInput({ seq: 0, input: 'a', predictedState: 's' });
    pred.confirmInput(0, 'server');
    pred.clear();
    expect(pred.pendingCount).toBe(0);
    expect(pred.lastConfirmedSequence).toBe(-1);
  });
});
