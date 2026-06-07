const MapPoint = require('../../src/models/MapPoint');

describe('MapPoint Model', () => {
  const valid = { id: 'p1', lat: 49.8, lng: 24.0, title: 'Парк Франка', createdBy: 'u1' };

  describe('constructor', () => {
    test('creates with valid data', () => {
      const p = new MapPoint(valid);
      expect(p.id).toBe('p1');
      expect(p.lat).toBe(49.8);
      expect(p.lng).toBe(24.0);
      expect(p.category).toBe('cleanup');
      expect(p.initiativeId).toBeNull();
    });
    test('throws without id', () => { expect(() => new MapPoint({ ...valid, id: undefined })).toThrow('id is required'); });
    test('throws without lat', () => { expect(() => new MapPoint({ ...valid, lat: undefined })).toThrow('Latitude is required'); });
    test('throws without lng', () => { expect(() => new MapPoint({ ...valid, lng: undefined })).toThrow('Longitude is required'); });
    test('throws with lat > 90', () => { expect(() => new MapPoint({ ...valid, lat: 91 })).toThrow('Latitude must be'); });
    test('throws with lat < -90', () => { expect(() => new MapPoint({ ...valid, lat: -91 })).toThrow('Latitude must be'); });
    test('throws with lng > 180', () => { expect(() => new MapPoint({ ...valid, lng: 181 })).toThrow('Longitude must be'); });
    test('throws with lng < -180', () => { expect(() => new MapPoint({ ...valid, lng: -181 })).toThrow('Longitude must be'); });
    test('throws with empty title', () => { expect(() => new MapPoint({ ...valid, title: '' })).toThrow('Title is required'); });
    test('throws without createdBy', () => { expect(() => new MapPoint({ ...valid, createdBy: undefined })).toThrow('CreatedBy is required'); });
    test('throws with invalid category', () => { expect(() => new MapPoint({ ...valid, category: 'unknown' })).toThrow('Category must be one of'); });
    test('accepts all valid categories', () => {
      ['cleanup', 'planting', 'recycling', 'awareness', 'other'].forEach(cat => {
        expect(() => new MapPoint({ ...valid, category: cat })).not.toThrow();
      });
    });
    test('trims title', () => { expect(new MapPoint({ ...valid, title: '  Парк  ' }).title).toBe('Парк'); });
    test('accepts lng=0', () => { expect(() => new MapPoint({ ...valid, lng: 0 })).not.toThrow(); });
    test('accepts lat=0', () => { expect(() => new MapPoint({ ...valid, lat: 0 })).not.toThrow(); });
    test('accepts boundary lat 90', () => { expect(() => new MapPoint({ ...valid, lat: 90 })).not.toThrow(); });
    test('accepts boundary lng 180', () => { expect(() => new MapPoint({ ...valid, lng: 180 })).not.toThrow(); });
  });

  describe('attachToInitiative', () => {
    test('sets initiativeId', () => { const p = new MapPoint(valid); p.attachToInitiative('i1'); expect(p.initiativeId).toBe('i1'); });
    test('throws without id', () => { expect(() => new MapPoint(valid).attachToInitiative(null)).toThrow('Initiative id is required'); });
  });

  describe('distanceTo', () => {
    test('returns 0 for same point', () => {
      const p = new MapPoint(valid);
      expect(p.distanceTo(p)).toBeCloseTo(0, 1);
    });
    test('calculates reasonable distance', () => {
      const lviv = new MapPoint({ ...valid, lat: 49.8397, lng: 24.0297 });
      const kyiv = new MapPoint({ ...valid, id: 'p2', lat: 50.4501, lng: 30.5234 });
      const dist = lviv.distanceTo(kyiv);
      expect(dist).toBeGreaterThan(400);
      expect(dist).toBeLessThan(600);
    });
  });

  describe('toJSON', () => {
    test('returns plain object', () => {
      const p = new MapPoint(valid);
      const json = p.toJSON();
      expect(json.id).toBe('p1');
      expect(json.initiativeId).toBeNull();
    });
  });
});
