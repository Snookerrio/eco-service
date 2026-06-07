const CalendarEvent = require('../../src/models/CalendarEvent');

describe('CalendarEvent Model', () => {
  const future = new Date(Date.now() + 86400000);
  const future2 = new Date(Date.now() + 172800000);
  const valid = { id: 'ev1', title: 'Прибирання', initiativeId: 'i1', organizerId: 'u1', startDate: future, endDate: future2 };

  describe('constructor', () => {
    test('creates valid event', () => {
      const e = new CalendarEvent(valid);
      expect(e.id).toBe('ev1');
      expect(e.attendees).toEqual([]);
      expect(e.isCancelled).toBe(false);
    });
    test('throws without id', () => { expect(() => new CalendarEvent({ ...valid, id: undefined })).toThrow('id is required'); });
    test('throws with empty title', () => { expect(() => new CalendarEvent({ ...valid, title: '' })).toThrow('title is required'); });
    test('throws without initiativeId', () => { expect(() => new CalendarEvent({ ...valid, initiativeId: undefined })).toThrow('Initiative id'); });
    test('throws without organizerId', () => { expect(() => new CalendarEvent({ ...valid, organizerId: undefined })).toThrow('Organizer id'); });
    test('throws without startDate', () => { expect(() => new CalendarEvent({ ...valid, startDate: undefined })).toThrow('Start date'); });
    test('throws without endDate', () => { expect(() => new CalendarEvent({ ...valid, endDate: undefined })).toThrow('End date'); });
    test('throws if end before start', () => { expect(() => new CalendarEvent({ ...valid, startDate: future2, endDate: future })).toThrow('after start'); });
    test('throws if end equals start', () => { expect(() => new CalendarEvent({ ...valid, endDate: future })).toThrow('after start'); });
    test('throws with invalid startDate string', () => { expect(() => new CalendarEvent({ ...valid, startDate: 'not-a-date' })).toThrow('Invalid start date'); });
    test('throws with invalid endDate string', () => { expect(() => new CalendarEvent({ ...valid, endDate: 'bad' })).toThrow('Invalid end date'); });
  });

  describe('attendees', () => {
    test('addAttendee', () => { const e = new CalendarEvent(valid); e.addAttendee('u2'); expect(e.attendees).toContain('u2'); });
    test('throws if already attending', () => { const e = new CalendarEvent(valid); e.addAttendee('u2'); expect(() => e.addAttendee('u2')).toThrow('already attending'); });
    test('removeAttendee', () => { const e = new CalendarEvent(valid); e.addAttendee('u2'); e.removeAttendee('u2'); expect(e.attendees).not.toContain('u2'); });
    test('removeAttendee throws if not attending', () => { expect(() => new CalendarEvent(valid).removeAttendee('u2')).toThrow('not attending'); });
    test('throws addAttendee if cancelled', () => { const e = new CalendarEvent(valid); e.cancel(); expect(() => e.addAttendee('u2')).toThrow('cancelled'); });
  });

  describe('cancel', () => {
    test('cancels event', () => { const e = new CalendarEvent(valid); e.cancel(); expect(e.isCancelled).toBe(true); });
    test('throws if already cancelled', () => { const e = new CalendarEvent(valid); e.cancel(); expect(() => e.cancel()).toThrow('already cancelled'); });
  });

  describe('status methods', () => {
    test('isUpcoming for future event', () => { expect(new CalendarEvent(valid).isUpcoming()).toBe(true); });
    test('isUpcoming false for cancelled', () => { const e = new CalendarEvent(valid); e.cancel(); expect(e.isUpcoming()).toBe(false); });
    test('isPast for old event', () => {
      const past = { ...valid, startDate: new Date(Date.now() - 172800000), endDate: new Date(Date.now() - 86400000) };
      expect(new CalendarEvent(past).isPast()).toBe(true);
    });
    test('isOngoing for current event', () => {
      const ongoing = { ...valid, startDate: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000) };
      expect(new CalendarEvent(ongoing).isOngoing()).toBe(true);
    });
    test('isOngoing false for cancelled', () => {
      const ongoing = { ...valid, startDate: new Date(Date.now() - 3600000), endDate: new Date(Date.now() + 3600000) };
      const e = new CalendarEvent(ongoing); e.cancel(); expect(e.isOngoing()).toBe(false);
    });
  });

  describe('durationHours', () => {
    test('returns correct hours', () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now() + 3600000 * 3);
      const e = new CalendarEvent({ ...valid, startDate: start, endDate: end });
      expect(e.durationHours()).toBeCloseTo(2, 1);
    });
  });

  describe('conflictsWith', () => {
    test('detects overlap', () => {
      const e1 = new CalendarEvent(valid);
      const e2 = new CalendarEvent({ ...valid, id: 'ev2', startDate: new Date(future.getTime() + 1000), endDate: new Date(future2.getTime() + 1000) });
      expect(e1.conflictsWith(e2)).toBe(true);
    });
    test('no conflict with non-overlapping', () => {
      const e1 = new CalendarEvent(valid);
      const start3 = new Date(future2.getTime() + 1000);
      const end3 = new Date(future2.getTime() + 86400000);
      const e2 = new CalendarEvent({ ...valid, id: 'ev2', startDate: start3, endDate: end3 });
      expect(e1.conflictsWith(e2)).toBe(false);
    });
  });

  describe('toJSON', () => {
    test('returns plain object', () => {
      const e = new CalendarEvent(valid);
      const json = e.toJSON();
      expect(json.id).toBe('ev1');
      expect(json.attendees).toEqual([]);
    });
  });
});
