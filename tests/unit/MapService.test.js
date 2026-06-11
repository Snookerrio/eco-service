const MapService = require('../../src/services/MapService');
const UserService = require('../../src/services/UserService');
const InitiativeService = require('../../src/services/InitiativeService');
const { UserRepository, MapPointRepository, InitiativeRepository } = require('../../src/storage/repositories');
const { NotificationService } = require('../../src/utils/notificationService');
const { StandardPointsStrategy } = require('../../src/utils/pointsStrategies');
const { resetCounters } = require('../../src/utils/idGenerator');

describe('MapService', () => {
  let userRepo, mapRepo, initRepo, userService, initService, mapService, organizer, admin, user;
  const validPoint = { lat: 49.84, lng: 24.03, title: 'Парк', category: 'cleanup' };

  beforeEach(() => {
    resetCounters();
    userRepo = new UserRepository();
    mapRepo = new MapPointRepository();
    initRepo = new InitiativeRepository();
    const notif = new NotificationService();
    userService = new UserService(userRepo, notif);
    initService = new InitiativeService(initRepo, userRepo, new StandardPointsStrategy(), notif);
    mapService = new MapService(mapRepo, initRepo, userRepo);

    admin = userService.register({ name: 'Admin', email: 'admin@eco.ua', role: 'admin' });
    organizer = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
    user = userService.register({ name: 'User', email: 'user@eco.ua' });
  });

  describe('constructor', () => {
    test('throws without repo', () => { expect(() => new MapService()).toThrow('MapPointRepository is required'); });
  });

  describe('addPoint', () => {
    test('adds point without initiative', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      expect(p.lat).toBe(49.84);
      expect(p.initiativeId).toBeNull();
    });
    test('blocked user cannot add', () => {
      userService.blockUser(admin.id, user.id);
      expect(() => mapService.addPoint({ ...validPoint, createdBy: user.id })).toThrow('Blocked');
    });
    test('attaches to initiative', () => {
      const init = initService.create({ title: 'T', organizerId: organizer.id, maxParticipants: 10 });
      const p = mapService.addPoint({ ...validPoint, createdBy: organizer.id, initiativeId: init.id });
      expect(p.initiativeId).toBe(init.id);
      expect(init.mapPoints).toContain(p.id);
    });
    test('throws for unknown initiative', () => {
      expect(() => mapService.addPoint({ ...validPoint, createdBy: user.id, initiativeId: 'ghost' })).toThrow('Initiative not found');
    });
    test('throws for unknown user', () => { expect(() => mapService.addPoint({ ...validPoint, createdBy: 'ghost' })).toThrow('User not found'); });
  });

  describe('getById', () => {
    test('returns point', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      expect(mapService.getById(p.id).id).toBe(p.id);
    });
    test('throws for missing', () => { expect(() => mapService.getById('ghost')).toThrow('not found'); });
  });

  describe('findNearby', () => {
    test('finds nearby points', () => {
      mapService.addPoint({ ...validPoint, createdBy: user.id });
      expect(mapService.findNearby(49.84, 24.03, 1).length).toBe(1);
    });
    test('excludes far points', () => {
      mapService.addPoint({ lat: 50.45, lng: 30.52, title: 'Kyiv', createdBy: user.id });
      expect(mapService.findNearby(49.84, 24.03, 50).length).toBe(0);
    });
    test('throws for radius <= 0', () => { expect(() => mapService.findNearby(49, 24, 0)).toThrow('Radius must be positive'); });
    test('throws for negative radius', () => { expect(() => mapService.findNearby(49, 24, -1)).toThrow('Radius must be positive'); });
  });

  describe('findByCategory', () => {
    test('returns matching category', () => {
      mapService.addPoint({ ...validPoint, category: 'planting', createdBy: user.id });
      expect(mapService.findByCategory('planting').length).toBe(1);
    });
    test('returns empty for no match', () => { expect(mapService.findByCategory('recycling').length).toBe(0); });
  });

  describe('deletePoint', () => {
    test('owner can delete', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      expect(mapService.deletePoint(p.id, user.id)).toBe(true);
    });
    test('admin can delete any', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      expect(mapService.deletePoint(p.id, admin.id)).toBe(true);
    });
    test('other user cannot delete', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      const other = userService.register({ name: 'O', email: 'o@eco.ua' });
      expect(() => mapService.deletePoint(p.id, other.id)).toThrow('Not authorized');
    });
    test('throws for unknown point', () => { expect(() => mapService.deletePoint('ghost', user.id)).toThrow('not found'); });
  });

  describe('updatePoint', () => {
    test('owner can update title', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      mapService.updatePoint(p.id, user.id, { title: 'New Title' });
      expect(p.title).toBe('New Title');
    });
    test('throws for empty title', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      expect(() => mapService.updatePoint(p.id, user.id, { title: '' })).toThrow('cannot be empty');
    });
    test('throws for invalid category', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      expect(() => mapService.updatePoint(p.id, user.id, { category: 'bad' })).toThrow('Invalid category');
    });
    test('non-owner cannot update', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      const other = userService.register({ name: 'O', email: 'o@eco.ua' });
      expect(() => mapService.updatePoint(p.id, other.id, { title: 'X' })).toThrow('Not authorized');
    });
    test('updates description', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      mapService.updatePoint(p.id, user.id, { description: 'new desc' });
      expect(p.description).toBe('new desc');
    });
    test('updates category', () => {
      const p = mapService.addPoint({ ...validPoint, createdBy: user.id });
      mapService.updatePoint(p.id, user.id, { category: 'planting' });
      expect(p.category).toBe('planting');
    });
  });

  describe('listAll', () => {
    test('returns all points', () => {
      mapService.addPoint({ ...validPoint, createdBy: user.id });
      mapService.addPoint({ ...validPoint, title: 'P2', createdBy: user.id });
      expect(mapService.listAll().length).toBe(2);
    });
  });
});
