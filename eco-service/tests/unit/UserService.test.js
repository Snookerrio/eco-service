const UserService = require('../../src/services/UserService');
const { UserRepository } = require('../../src/storage/repositories');
const { NotificationService } = require('../../src/utils/notificationService');
const { resetCounters } = require('../../src/utils/idGenerator');

describe('UserService', () => {
  let repo, notif, service;
  beforeEach(() => {
    resetCounters();
    repo = new UserRepository();
    notif = new NotificationService();
    service = new UserService(repo, notif);
  });

  describe('constructor', () => {
    test('throws without repo', () => { expect(() => new UserService()).toThrow('UserRepository is required'); });
    test('works without notif', () => { expect(() => new UserService(repo)).not.toThrow(); });
  });

  describe('register', () => {
    test('creates user', () => {
      const u = service.register({ name: 'Ольга', email: 'olga@eco.ua' });
      expect(u.name).toBe('Ольга');
      expect(u.email).toBe('olga@eco.ua');
    });
    test('saves to repo', () => {
      service.register({ name: 'A', email: 'a@eco.ua' });
      expect(repo.count()).toBe(1);
    });
    test('sends welcome notification', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      expect(notif.getForUser(u.id).length).toBeGreaterThan(0);
    });
    test('throws for duplicate email', () => {
      service.register({ name: 'A', email: 'same@eco.ua' });
      expect(() => service.register({ name: 'B', email: 'same@eco.ua' })).toThrow('already registered');
    });
    test('throws with invalid role', () => { expect(() => service.register({ name: 'A', email: 'a@eco.ua', role: 'superuser' })).toThrow('Invalid role'); });
    test('creates organizer role', () => { expect(service.register({ name: 'A', email: 'a@eco.ua', role: 'organizer' }).role).toBe('organizer'); });
    test('throws with empty name', () => { expect(() => service.register({ name: '', email: 'a@eco.ua' })).toThrow('Name is required'); });
    test('throws without email', () => { expect(() => service.register({ name: 'A' })).toThrow(); });
  });

  describe('getById', () => {
    test('returns user', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      expect(service.getById(u.id).id).toBe(u.id);
    });
    test('throws for missing id', () => { expect(() => service.getById('bad')).toThrow('User not found'); });
  });

  describe('getByEmail', () => {
    test('returns user', () => {
      service.register({ name: 'A', email: 'a@eco.ua' });
      expect(service.getByEmail('a@eco.ua').name).toBe('A');
    });
    test('throws if not found', () => { expect(() => service.getByEmail('no@eco.ua')).toThrow('not found with email'); });
  });

  describe('blockUser / unblockUser', () => {
    let admin, participant;
    beforeEach(() => {
      admin = service.register({ name: 'Admin', email: 'admin@eco.ua', role: 'admin' });
      participant = service.register({ name: 'P', email: 'p@eco.ua' });
    });
    test('admin can block', () => { service.blockUser(admin.id, participant.id); expect(participant.isBlocked).toBe(true); });
    test('sends notification on block', () => { service.blockUser(admin.id, participant.id); expect(notif.getForUser(participant.id).length).toBeGreaterThan(0); });
    test('throws if not admin', () => { expect(() => service.blockUser(participant.id, participant.id)).toThrow('Only admins'); });
    test('throws if target already blocked', () => { service.blockUser(admin.id, participant.id); expect(() => service.blockUser(admin.id, participant.id)).toThrow('already blocked'); });
    test('throws for unknown target', () => { expect(() => service.blockUser(admin.id, 'ghost')).toThrow('not found'); });
    test('admin can unblock', () => { service.blockUser(admin.id, participant.id); service.unblockUser(admin.id, participant.id); expect(participant.isBlocked).toBe(false); });
    test('throws unblock if not blocked', () => { expect(() => service.unblockUser(admin.id, participant.id)).toThrow('not blocked'); });
  });

  describe('awardPoints / deductPoints', () => {
    test('awards points', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      service.awardPoints(u.id, 50);
      expect(u.points).toBe(50);
    });
    test('sends reward notification', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      service.awardPoints(u.id, 10, 'test');
      const notifs = notif.getForUser(u.id).filter(n => n.type === 'reward');
      expect(notifs.length).toBeGreaterThan(0);
    });
    test('throws for unknown user', () => { expect(() => service.awardPoints('ghost', 10)).toThrow('not found'); });
    test('deducts points', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      service.awardPoints(u.id, 50);
      service.deductPoints(u.id, 20);
      expect(u.points).toBe(30);
    });
    test('deductPoints throws for insufficient', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      expect(() => service.deductPoints(u.id, 10)).toThrow();
    });
  });

  describe('getLeaderboard', () => {
    test('returns top users sorted', () => {
      const u1 = service.register({ name: 'A', email: 'a@eco.ua' }); service.awardPoints(u1.id, 100);
      const u2 = service.register({ name: 'B', email: 'b@eco.ua' }); service.awardPoints(u2.id, 200);
      const lb = service.getLeaderboard(2);
      expect(lb[0].rank).toBe(1);
      expect(lb[0].points).toBe(200);
    });
    test('includes rank', () => {
      service.register({ name: 'A', email: 'a@eco.ua' });
      expect(service.getLeaderboard()[0].rank).toBe(1);
    });
  });

  describe('updateProfile', () => {
    test('updates name', () => {
      const u = service.register({ name: 'Old', email: 'a@eco.ua' });
      service.updateProfile(u.id, { name: 'New' });
      expect(u.name).toBe('New');
    });
    test('throws for duplicate email', () => {
      const u1 = service.register({ name: 'A', email: 'a@eco.ua' });
      service.register({ name: 'B', email: 'b@eco.ua' });
      expect(() => service.updateProfile(u1.id, { email: 'b@eco.ua' })).toThrow('already in use');
    });
    test('throws for invalid email', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      expect(() => service.updateProfile(u.id, { email: 'bad' })).toThrow('Invalid email');
    });
    test('throws for unknown user', () => { expect(() => service.updateProfile('ghost', { name: 'X' })).toThrow('not found'); });
  });

  describe('list methods', () => {
    test('listAll', () => { service.register({ name: 'A', email: 'a@eco.ua' }); expect(service.listAll().length).toBe(1); });
    test('listActive', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      const admin = service.register({ name: 'Admin', email: 'adm@eco.ua', role: 'admin' });
      service.blockUser(admin.id, u.id);
      expect(service.listActive().length).toBe(1);
    });
    test('listBlocked', () => {
      const u = service.register({ name: 'A', email: 'a@eco.ua' });
      const admin = service.register({ name: 'Admin', email: 'adm@eco.ua', role: 'admin' });
      service.blockUser(admin.id, u.id);
      expect(service.listBlocked().length).toBe(1);
    });
  });
});
