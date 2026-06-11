const User = require('../../src/models/User');

describe('User Model', () => {
  const validData = { id: 'u1', name: 'Іван Петров', email: 'ivan@eco.ua' };

  describe('constructor', () => {
    test('creates user with valid data', () => {
      const u = new User(validData);
      expect(u.id).toBe('u1');
      expect(u.name).toBe('Іван Петров');
      expect(u.email).toBe('ivan@eco.ua');
      expect(u.role).toBe('participant');
      expect(u.points).toBe(0);
      expect(u.isBlocked).toBe(false);
    });
    test('trims name', () => { expect(new User({ ...validData, name: '  Іван  ' }).name).toBe('Іван'); });
    test('lowercases email', () => { expect(new User({ ...validData, email: 'Ivan@ECO.ua' }).email).toBe('ivan@eco.ua'); });
    test('throws without id', () => { expect(() => new User({ name: 'x', email: 'a@b.c' })).toThrow('id is required'); });
    test('throws with empty name', () => { expect(() => new User({ id: 'x', name: '', email: 'a@b.c' })).toThrow('name is required'); });
    test('throws with whitespace name', () => { expect(() => new User({ id: 'x', name: '   ', email: 'a@b.c' })).toThrow('name is required'); });
    test('throws with invalid email', () => { expect(() => new User({ id: 'x', name: 'A', email: 'notanemail' })).toThrow('Invalid email'); });
    test('throws without email', () => { expect(() => new User({ id: 'x', name: 'A' })).toThrow(); });
    test('accepts organizer role', () => { expect(new User({ ...validData, role: 'organizer' }).role).toBe('organizer'); });
    test('initializes empty arrays', () => {
      const u = new User(validData);
      expect(u.joinedInitiatives).toEqual([]);
      expect(u.prizes).toEqual([]);
    });
    test('accepts initial points', () => { expect(new User({ ...validData, points: 50 }).points).toBe(50); });
    test('accepts isBlocked flag', () => { expect(new User({ ...validData, isBlocked: true }).isBlocked).toBe(true); });
  });

  describe('addPoints', () => {
    test('increases points', () => { const u = new User(validData); u.addPoints(20); expect(u.points).toBe(20); });
    test('accumulates points', () => { const u = new User(validData); u.addPoints(10); u.addPoints(15); expect(u.points).toBe(25); });
    test('throws for zero', () => { expect(() => new User(validData).addPoints(0)).toThrow('must be positive'); });
    test('throws for negative', () => { expect(() => new User(validData).addPoints(-5)).toThrow('must be positive'); });
  });

  describe('deductPoints', () => {
    test('reduces points', () => { const u = new User({ ...validData, points: 30 }); u.deductPoints(10); expect(u.points).toBe(20); });
    test('throws for insufficient points', () => { expect(() => new User(validData).deductPoints(10)).toThrow('Insufficient'); });
    test('throws for zero', () => { expect(() => new User({ ...validData, points: 10 }).deductPoints(0)).toThrow('must be positive'); });
    test('throws for negative', () => { expect(() => new User({ ...validData, points: 10 }).deductPoints(-1)).toThrow('must be positive'); });
    test('exact amount works', () => { const u = new User({ ...validData, points: 10 }); u.deductPoints(10); expect(u.points).toBe(0); });
  });

  describe('block/unblock', () => {
    test('blocks user', () => { const u = new User(validData); u.block(); expect(u.isBlocked).toBe(true); });
    test('unblocks user', () => { const u = new User({ ...validData, isBlocked: true }); u.unblock(); expect(u.isBlocked).toBe(false); });
  });

  describe('role checks', () => {
    test('isOrganizer true', () => { expect(new User({ ...validData, role: 'organizer' }).isOrganizer()).toBe(true); });
    test('isOrganizer false for participant', () => { expect(new User(validData).isOrganizer()).toBe(false); });
    test('isAdmin true', () => { expect(new User({ ...validData, role: 'admin' }).isAdmin()).toBe(true); });
    test('isAdmin false for organizer', () => { expect(new User({ ...validData, role: 'organizer' }).isAdmin()).toBe(false); });
  });

  describe('joinInitiative', () => {
    test('adds initiative id', () => { const u = new User(validData); u.joinInitiative('i1'); expect(u.joinedInitiatives).toContain('i1'); });
    test('throws if blocked', () => { const u = new User({ ...validData, isBlocked: true }); expect(() => u.joinInitiative('i1')).toThrow('Blocked'); });
    test('throws if already joined', () => { const u = new User(validData); u.joinInitiative('i1'); expect(() => u.joinInitiative('i1')).toThrow('Already joined'); });
  });

  describe('leaveInitiative', () => {
    test('removes initiative id', () => { const u = new User(validData); u.joinInitiative('i1'); u.leaveInitiative('i1'); expect(u.joinedInitiatives).not.toContain('i1'); });
    test('throws if not joined', () => { expect(() => new User(validData).leaveInitiative('i1')).toThrow('not part'); });
  });

  describe('toJSON', () => {
    test('returns plain object', () => {
      const u = new User(validData);
      const json = u.toJSON();
      expect(json.id).toBe('u1');
      expect(json.joinedInitiatives).toEqual([]);
    });
  });
});
