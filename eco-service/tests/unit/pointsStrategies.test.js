const {
  StandardPointsStrategy,
  BonusMultiplierStrategy,
  ProgressivePointsStrategy,
  StreakBonusStrategy,
  PenaltyStrategy,
  BasePointsStrategy,
} = require('../../src/utils/pointsStrategies');

describe('Points Strategies', () => {
  describe('BasePointsStrategy', () => {
    test('calculate throws (abstract)', () => { expect(() => new BasePointsStrategy().calculate(10)).toThrow('must be implemented'); });
    test('getName throws (abstract)', () => { expect(() => new BasePointsStrategy().getName()).toThrow('must be implemented'); });
  });

  describe('StandardPointsStrategy', () => {
    const s = new StandardPointsStrategy();
    test('getName returns standard', () => { expect(s.getName()).toBe('standard'); });
    test('returns base points unchanged', () => { expect(s.calculate(50)).toBe(50); });
    test('returns 0 for 0', () => { expect(s.calculate(0)).toBe(0); });
    test('throws for negative', () => { expect(() => s.calculate(-1)).toThrow('cannot be negative'); });
    test('ignores context', () => { expect(s.calculate(20, { participantCount: 100 })).toBe(20); });
  });

  describe('BonusMultiplierStrategy', () => {
    test('getName returns bonus_multiplier', () => { expect(new BonusMultiplierStrategy().getName()).toBe('bonus_multiplier'); });
    test('no bonus below 10 participants', () => { expect(new BonusMultiplierStrategy().calculate(10, { participantCount: 5 })).toBe(10); });
    test('applies multiplier at 10+', () => { expect(new BonusMultiplierStrategy(2).calculate(10, { participantCount: 10 })).toBe(20); });
    test('applies floor', () => { expect(new BonusMultiplierStrategy(1.5).calculate(3, { participantCount: 10 })).toBe(4); });
    test('throws for non-positive multiplier', () => { expect(() => new BonusMultiplierStrategy(0)).toThrow('must be positive'); });
    test('throws for negative multiplier', () => { expect(() => new BonusMultiplierStrategy(-1)).toThrow('must be positive'); });
    test('throws for negative points', () => { expect(() => new BonusMultiplierStrategy().calculate(-1)).toThrow('cannot be negative'); });
    test('default multiplier 1.5', () => { expect(new BonusMultiplierStrategy().calculate(10, { participantCount: 10 })).toBe(15); });
    test('no context defaults to 1 participant', () => { expect(new BonusMultiplierStrategy().calculate(10)).toBe(10); });
  });

  describe('ProgressivePointsStrategy', () => {
    const s = new ProgressivePointsStrategy();
    test('getName returns progressive', () => { expect(s.getName()).toBe('progressive'); });
    test('x1 for < 10', () => { expect(s.calculate(100, { participantCount: 5 })).toBe(100); });
    test('x1.25 for 10-19', () => { expect(s.calculate(100, { participantCount: 10 })).toBe(125); });
    test('x1.5 for 20-49', () => { expect(s.calculate(100, { participantCount: 20 })).toBe(150); });
    test('x2 for 50+', () => { expect(s.calculate(100, { participantCount: 50 })).toBe(200); });
    test('no context defaults to 1', () => { expect(s.calculate(100)).toBe(100); });
    test('throws for negative points', () => { expect(() => s.calculate(-5)).toThrow(); });
    test('floors result', () => { expect(s.calculate(3, { participantCount: 10 })).toBe(3); });
  });

  describe('StreakBonusStrategy', () => {
    const s = new StreakBonusStrategy();
    test('getName returns streak_bonus', () => { expect(s.getName()).toBe('streak_bonus'); });
    test('no streak gives base', () => { expect(s.calculate(50)).toBe(50); });
    test('adds 5 per streak', () => { expect(s.calculate(50, { streak: 3 })).toBe(65); });
    test('caps at +50', () => { expect(s.calculate(50, { streak: 20 })).toBe(100); });
    test('streak 10 gives +50', () => { expect(s.calculate(50, { streak: 10 })).toBe(100); });
    test('throws for negative points', () => { expect(() => s.calculate(-1)).toThrow(); });
    test('zero streak no bonus', () => { expect(s.calculate(20, { streak: 0 })).toBe(20); });
  });

  describe('PenaltyStrategy', () => {
    test('getName returns penalty', () => { expect(new PenaltyStrategy().getName()).toBe('penalty'); });
    test('no penalty if completed', () => { expect(new PenaltyStrategy().calculate(100, { completed: true })).toBe(100); });
    test('applies penalty if not completed', () => { expect(new PenaltyStrategy(20).calculate(100, { completed: false })).toBe(80); });
    test('defaults to completed=true', () => { expect(new PenaltyStrategy().calculate(100)).toBe(100); });
    test('throws with penalty < 0', () => { expect(() => new PenaltyStrategy(-1)).toThrow('0-100%'); });
    test('throws with penalty > 100', () => { expect(() => new PenaltyStrategy(101)).toThrow('0-100%'); });
    test('100% penalty gives 0', () => { expect(new PenaltyStrategy(100).calculate(100, { completed: false })).toBe(0); });
    test('0% penalty gives full', () => { expect(new PenaltyStrategy(0).calculate(100, { completed: false })).toBe(100); });
    test('throws for negative points', () => { expect(() => new PenaltyStrategy().calculate(-1)).toThrow(); });
  });
});
