const Prize = require('../../src/models/Prize');

describe('Prize Model', () => {
  const valid = { id: 'pr1', name: 'Еко-торбинка', pointsCost: 50 };

  describe('constructor', () => {
    test('creates with defaults', () => {
      const p = new Prize(valid);
      expect(p.id).toBe('pr1');
      expect(p.pointsCost).toBe(50);
      expect(p.quantity).toBe(Infinity);
      expect(p.claimedBy).toEqual([]);
    });
    test('throws without id', () => { expect(() => new Prize({ ...valid, id: undefined })).toThrow('id is required'); });
    test('throws with empty name', () => { expect(() => new Prize({ ...valid, name: '' })).toThrow('name is required'); });
    test('throws without pointsCost', () => { expect(() => new Prize({ name: 'x' })).toThrow(); });
    test('throws with zero pointsCost', () => { expect(() => new Prize({ ...valid, pointsCost: 0 })).toThrow('must be positive'); });
    test('throws with negative pointsCost', () => { expect(() => new Prize({ ...valid, pointsCost: -1 })).toThrow('must be positive'); });
    test('throws with negative quantity', () => { expect(() => new Prize({ ...valid, quantity: -1 })).toThrow('cannot be negative'); });
    test('accepts quantity 0', () => { expect(() => new Prize({ ...valid, quantity: 0 })).not.toThrow(); });
    test('finite quantity', () => { const p = new Prize({ ...valid, quantity: 5 }); expect(p.quantity).toBe(5); });
  });

  describe('isAvailable', () => {
    test('infinite quantity is always available', () => { expect(new Prize(valid).isAvailable()).toBe(true); });
    test('finite with stock available', () => { expect(new Prize({ ...valid, quantity: 5 }).isAvailable()).toBe(true); });
    test('finite out of stock', () => {
      const p = new Prize({ ...valid, quantity: 1 });
      p.claim('u1');
      expect(p.isAvailable()).toBe(false);
    });
    test('zero quantity not available', () => { expect(new Prize({ ...valid, quantity: 0 }).isAvailable()).toBe(false); });
  });

  describe('remainingCount', () => {
    test('returns null-like Infinity for unlimited', () => { expect(new Prize(valid).remainingCount()).toBe(Infinity); });
    test('decreases after claim', () => {
      const p = new Prize({ ...valid, quantity: 3 });
      p.claim('u1');
      expect(p.remainingCount()).toBe(2);
    });
    test('returns 0 when exhausted', () => {
      const p = new Prize({ ...valid, quantity: 1 });
      p.claim('u1');
      expect(p.remainingCount()).toBe(0);
    });
  });

  describe('claim', () => {
    test('adds userId', () => { const p = new Prize(valid); p.claim('u1'); expect(p.claimedBy).toContain('u1'); });
    test('throws if out of stock', () => {
      const p = new Prize({ ...valid, quantity: 1 }); p.claim('u1');
      expect(() => p.claim('u2')).toThrow('out of stock');
    });
    test('throws if already claimed', () => {
      const p = new Prize(valid); p.claim('u1');
      expect(() => p.claim('u1')).toThrow('already claimed');
    });
    test('multiple users can claim unlimited prize', () => {
      const p = new Prize(valid);
      p.claim('u1'); p.claim('u2'); p.claim('u3');
      expect(p.claimedBy.length).toBe(3);
    });
  });

  describe('toJSON', () => {
    test('shows remaining', () => {
      const p = new Prize({ ...valid, quantity: 5 });
      p.claim('u1');
      const json = p.toJSON();
      expect(json.remaining).toBe(4);
    });
    test('null quantity for unlimited', () => {
      const json = new Prize(valid).toJSON();
      expect(json.quantity).toBeNull();
      expect(json.remaining).toBeNull();
    });
  });
});
