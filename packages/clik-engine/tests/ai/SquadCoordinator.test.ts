import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/debug/ConsoleReporter', () => ({
  ConsoleReporter: { state: vi.fn(), error: vi.fn(), engine: vi.fn() },
}));

import { SquadCoordinator } from '../../src/ai/SquadCoordinator';

function makeEntity(active = true) {
  return { active, x: 0, y: 0, entityType: 'enemy', hasTag: () => false } as any;
}

describe('SquadCoordinator', () => {
  it('adds and counts members', () => {
    const squad = new SquadCoordinator();
    squad.addMember(makeEntity(), 'attacker');
    squad.addMember(makeEntity(), 'flanker');
    expect(squad.memberCount).toBe(2);
  });

  it('removes members', () => {
    const squad = new SquadCoordinator();
    const e = makeEntity();
    squad.addMember(e);
    squad.removeMember(e);
    expect(squad.memberCount).toBe(0);
  });

  it('grants attack tokens up to max', () => {
    const squad = new SquadCoordinator({ maxAttackers: 2 });
    const e1 = makeEntity();
    const e2 = makeEntity();
    const e3 = makeEntity();
    squad.addMember(e1).addMember(e2).addMember(e3);

    expect(squad.requestAttackToken(e1)).toBe(true);
    expect(squad.requestAttackToken(e2)).toBe(true);
    expect(squad.requestAttackToken(e3)).toBe(false);
    expect(squad.activeAttackers).toBe(2);
  });

  it('re-grants token to entity that already has one', () => {
    const squad = new SquadCoordinator({ maxAttackers: 1 });
    const e = makeEntity();
    squad.addMember(e);
    squad.requestAttackToken(e);
    expect(squad.requestAttackToken(e)).toBe(true);
  });

  it('releaseAttackToken frees slot', () => {
    const squad = new SquadCoordinator({ maxAttackers: 1 });
    const e1 = makeEntity();
    const e2 = makeEntity();
    squad.addMember(e1).addMember(e2);

    squad.requestAttackToken(e1);
    expect(squad.requestAttackToken(e2)).toBe(false);

    squad.releaseAttackToken(e1);
    expect(squad.requestAttackToken(e2)).toBe(true);
  });

  it('rejects token for non-members', () => {
    const squad = new SquadCoordinator();
    expect(squad.requestAttackToken(makeEntity())).toBe(false);
  });

  it('update prunes inactive members', () => {
    const squad = new SquadCoordinator();
    const e = makeEntity(true);
    squad.addMember(e);
    e.active = false;
    squad.update();
    expect(squad.memberCount).toBe(0);
  });

  it('getMembersByRole filters correctly', () => {
    const squad = new SquadCoordinator();
    const a1 = makeEntity();
    const f1 = makeEntity();
    squad.addMember(a1, 'attacker');
    squad.addMember(f1, 'flanker');

    expect(squad.getMembersByRole('attacker')).toContain(a1);
    expect(squad.getMembersByRole('attacker')).not.toContain(f1);
  });

  it('setRole changes member role', () => {
    const squad = new SquadCoordinator();
    const e = makeEntity();
    squad.addMember(e, 'attacker');
    squad.setRole(e, 'supporter');
    expect(squad.getRole(e)).toBe('supporter');
  });

  it('circle formation generates correct offsets', () => {
    const squad = new SquadCoordinator();
    squad.addMember(makeEntity());
    squad.addMember(makeEntity());
    squad.addMember(makeEntity());
    squad.addMember(makeEntity());
    squad.setCircleFormation(50);
    squad.setTarget({ x: 100, y: 100 });

    const pos = squad.getFormationPosition(squad.getMembers()[0]);
    expect(pos).not.toBeNull();
    // First slot at angle 0: x = 100+50, y = 100+0
    expect(pos!.x).toBeCloseTo(150, 0);
    expect(pos!.y).toBeCloseTo(100, 0);
  });

  it('line formation generates correct offsets', () => {
    const squad = new SquadCoordinator();
    squad.addMember(makeEntity());
    squad.addMember(makeEntity());
    squad.addMember(makeEntity());
    squad.setLineFormation(30);
    squad.setTarget({ x: 100, y: 100 });

    const positions = squad.getMembers().map(e => squad.getFormationPosition(e));
    expect(positions[0]!.x).toBeCloseTo(70, 0);
    expect(positions[1]!.x).toBeCloseTo(100, 0);
    expect(positions[2]!.x).toBeCloseTo(130, 0);
  });

  it('getFormationPosition returns null without target', () => {
    const squad = new SquadCoordinator();
    const e = makeEntity();
    squad.addMember(e);
    squad.setCircleFormation(50);
    expect(squad.getFormationPosition(e)).toBeNull();
  });

  it('destroy clears everything', () => {
    const squad = new SquadCoordinator();
    squad.addMember(makeEntity());
    squad.destroy();
    expect(squad.memberCount).toBe(0);
    expect(squad.getTarget()).toBeNull();
  });
});
