const { Initiative } = require('../../src/models/Initiative');

describe('Initiative Model', () => {
  const valid = { id: 'i1', title: 'Прибирання парку', organizerId: 'u1', maxParticipants: 20 };

  describe('constructor', () => {
    test('creates with defaults', () => {
      const i = new Initiative(valid);
      expect(i.status).toBe('draft');
      expect(i.participants).toEqual([]);
      expect(i.pointsReward).toBe(10);
    });
    test('throws without id', () => { expect(() => new Initiative({ ...valid, id: undefined })).toThrow('id is required'); });
    test('throws with empty title', () => { expect(() => new Initiative({ ...valid, title: '' })).toThrow('title is required'); });
    test('throws without organizerId', () => { expect(() => new Initiative({ ...valid, organizerId: undefined })).toThrow('Organizer id'); });
    test('throws with maxParticipants 0', () => { expect(() => new Initiative({ ...valid, maxParticipants: 0 })).toThrow('must be positive'); });
    test('throws with negative maxParticipants', () => { expect(() => new Initiative({ ...valid, maxParticipants: -1 })).toThrow('must be positive'); });
    test('throws with negative pointsReward', () => { expect(() => new Initiative({ ...valid, pointsReward: -5 })).toThrow('cannot be negative'); });
    test('accepts zero pointsReward', () => { expect(() => new Initiative({ ...valid, pointsReward: 0 })).not.toThrow(); });
  });

  describe('lifecycle', () => {
    test('publish from draft', () => { const i = new Initiative(valid); i.publish(); expect(i.status).toBe('open'); });
    test('cannot publish if not draft', () => { const i = new Initiative(valid); i.publish(); expect(() => i.publish()).toThrow('Only draft'); });
    test('start from open', () => { const i = new Initiative(valid); i.publish(); i.start(); expect(i.status).toBe('ongoing'); });
    test('cannot start if draft', () => { expect(() => new Initiative(valid).start()).toThrow('Only open'); });
    test('complete from ongoing', () => {
      const i = new Initiative(valid); i.publish(); i.start(); i.complete();
      expect(i.status).toBe('completed');
      expect(i.completedAt).toBeTruthy();
    });
    test('cannot complete if open', () => { const i = new Initiative(valid); i.publish(); expect(() => i.complete()).toThrow('Only ongoing'); });
    test('cancel from draft', () => { const i = new Initiative(valid); i.cancel(); expect(i.status).toBe('cancelled'); });
    test('cancel from open', () => { const i = new Initiative(valid); i.publish(); i.cancel(); expect(i.status).toBe('cancelled'); });
    test('cannot cancel completed', () => { const i = new Initiative(valid); i.publish(); i.start(); i.complete(); expect(() => i.cancel()).toThrow('Cannot cancel'); });
    test('cannot cancel already cancelled', () => { const i = new Initiative(valid); i.cancel(); expect(() => i.cancel()).toThrow('Cannot cancel'); });
  });

  describe('participants', () => {
    test('addParticipant to open initiative', () => {
      const i = new Initiative(valid); i.publish();
      i.addParticipant('u2');
      expect(i.participants).toContain('u2');
    });
    test('throws if not open', () => { expect(() => new Initiative(valid).addParticipant('u2')).toThrow('not open'); });
    test('throws if already participant', () => {
      const i = new Initiative(valid); i.publish();
      i.addParticipant('u2'); expect(() => i.addParticipant('u2')).toThrow('already participating');
    });
    test('throws if full', () => {
      const i = new Initiative({ ...valid, maxParticipants: 1 }); i.publish();
      i.addParticipant('u2'); expect(() => i.addParticipant('u3')).toThrow('full');
    });
    test('removeParticipant', () => {
      const i = new Initiative(valid); i.publish(); i.addParticipant('u2');
      i.removeParticipant('u2'); expect(i.participants).not.toContain('u2');
    });
    test('removeParticipant throws if not in', () => { expect(() => new Initiative(valid).removeParticipant('u2')).toThrow('not a participant'); });
    test('isFull returns false when not full', () => { const i = new Initiative(valid); i.publish(); expect(i.isFull()).toBe(false); });
    test('isFull returns true when full', () => {
      const i = new Initiative({ ...valid, maxParticipants: 1 }); i.publish();
      i.addParticipant('u2'); expect(i.isFull()).toBe(true);
    });
    test('participantCount', () => {
      const i = new Initiative(valid); i.publish(); i.addParticipant('u2'); i.addParticipant('u3');
      expect(i.participantCount()).toBe(2);
    });
  });

  describe('map points and events', () => {
    test('addMapPoint', () => { const i = new Initiative(valid); i.addMapPoint('mp1'); expect(i.mapPoints).toContain('mp1'); });
    test('addMapPoint no duplicate', () => { const i = new Initiative(valid); i.addMapPoint('mp1'); i.addMapPoint('mp1'); expect(i.mapPoints.length).toBe(1); });
    test('addEvent', () => { const i = new Initiative(valid); i.addEvent('ev1'); expect(i.events).toContain('ev1'); });
  });

  describe('toJSON', () => {
    test('returns serializable object', () => {
      const i = new Initiative(valid);
      const json = i.toJSON();
      expect(json.id).toBe('i1');
      expect(json.completedAt).toBeNull();
    });
  });
});
