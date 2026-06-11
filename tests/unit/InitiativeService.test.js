const InitiativeService = require('../../src/services/InitiativeService');
const UserService = require('../../src/services/UserService');
const { UserRepository, InitiativeRepository } = require('../../src/storage/repositories');
const { NotificationService } = require('../../src/utils/notificationService');
const { StandardPointsStrategy, BonusMultiplierStrategy } = require('../../src/utils/pointsStrategies');
const { resetCounters } = require('../../src/utils/idGenerator');

describe('InitiativeService', () => {
  let userRepo, initRepo, notif, userService, service, organizer, participant, admin;

  beforeEach(() => {
    resetCounters();
    userRepo = new UserRepository();
    initRepo = new InitiativeRepository();
    notif = new NotificationService();
    const strategy = new StandardPointsStrategy();
    userService = new UserService(userRepo, notif);
    service = new InitiativeService(initRepo, userRepo, strategy, notif);

    organizer = userService.register({ name: 'Організатор', email: 'org@eco.ua', role: 'organizer' });
    participant = userService.register({ name: 'Учасник', email: 'part@eco.ua' });
    admin = userService.register({ name: 'Адмін', email: 'admin@eco.ua', role: 'admin' });
  });

  describe('constructor', () => {
    test('throws without initRepo', () => { expect(() => new InitiativeService()).toThrow('InitiativeRepository is required'); });
    test('throws without userRepo', () => { expect(() => new InitiativeService(initRepo)).toThrow('UserRepository is required'); });
  });

  describe('create', () => {
    test('organizer can create', () => {
      const i = service.create({ title: 'Прибирання', organizerId: organizer.id, maxParticipants: 10 });
      expect(i.title).toBe('Прибирання');
      expect(i.status).toBe('draft');
    });
    test('admin can create', () => { expect(() => service.create({ title: 'T', organizerId: admin.id, maxParticipants: 5 })).not.toThrow(); });
    test('participant cannot create', () => { expect(() => service.create({ title: 'T', organizerId: participant.id })).toThrow('Only organizers'); });
    test('blocked organizer cannot create', () => {
      userService.blockUser(admin.id, organizer.id);
      expect(() => service.create({ title: 'T', organizerId: organizer.id })).toThrow('Blocked');
    });
    test('throws for unknown organizer', () => { expect(() => service.create({ title: 'T', organizerId: 'ghost' })).toThrow('Organizer not found'); });
  });

  describe('publish', () => {
    test('publishes initiative', () => {
      const i = service.create({ title: 'T', organizerId: organizer.id, maxParticipants: 10 });
      service.publish(i.id, organizer.id);
      expect(i.status).toBe('open');
    });
    test('notifies active users', () => {
      const i = service.create({ title: 'T', organizerId: organizer.id, maxParticipants: 10 });
      service.publish(i.id, organizer.id);
      expect(notif.getForUser(participant.id).some(n => n.type === 'initiative')).toBe(true);
    });
    test('other organizer cannot publish', () => {
      const org2 = userService.register({ name: 'Org2', email: 'org2@eco.ua', role: 'organizer' });
      const i = service.create({ title: 'T', organizerId: organizer.id, maxParticipants: 5 });
      expect(() => service.publish(i.id, org2.id)).toThrow('organizer or admin');
    });
    test('admin can publish', () => {
      const i = service.create({ title: 'T', organizerId: organizer.id, maxParticipants: 5 });
      expect(() => service.publish(i.id, admin.id)).not.toThrow();
    });
  });

  describe('join / leave', () => {
    let initiative;
    beforeEach(() => {
      initiative = service.create({ title: 'T', organizerId: organizer.id, maxParticipants: 10 });
      service.publish(initiative.id, organizer.id);
    });
    test('participant can join', () => {
      service.join(initiative.id, participant.id);
      expect(initiative.participants).toContain(participant.id);
    });
    test('blocked user cannot join', () => {
      userService.blockUser(admin.id, participant.id);
      expect(() => service.join(initiative.id, participant.id)).toThrow('Blocked');
    });
    test('join notifies user and organizer', () => {
      service.join(initiative.id, participant.id);
      expect(notif.getForUser(participant.id).some(n => n.type === 'info')).toBe(true);
      expect(notif.getForUser(organizer.id).length).toBeGreaterThan(0);
    });
    test('user in joinedInitiatives after join', () => {
      service.join(initiative.id, participant.id);
      expect(participant.joinedInitiatives).toContain(initiative.id);
    });
    test('leave removes participant', () => {
      service.join(initiative.id, participant.id);
      service.leave(initiative.id, participant.id);
      expect(initiative.participants).not.toContain(participant.id);
    });
    test('throws join for unknown user', () => { expect(() => service.join(initiative.id, 'ghost')).toThrow('User not found'); });
    test('throws leave for unknown user', () => { expect(() => service.leave(initiative.id, 'ghost')).toThrow('User not found'); });
  });

  describe('start / complete / cancel', () => {
    let initiative;
    beforeEach(() => {
      initiative = service.create({ title: 'T', organizerId: organizer.id, maxParticipants: 10, pointsReward: 20 });
      service.publish(initiative.id, organizer.id);
      service.join(initiative.id, participant.id);
    });

    test('start changes status', () => { service.start(initiative.id, organizer.id); expect(initiative.status).toBe('ongoing'); });
    test('start notifies participants', () => {
      service.start(initiative.id, organizer.id);
      expect(notif.getForUser(participant.id).some(n => n.message.includes('started'))).toBe(true);
    });

    test('complete awards points', () => {
      service.start(initiative.id, organizer.id);
      service.complete(initiative.id, organizer.id);
      expect(participant.points).toBe(20);
    });
    test('complete with bonus strategy awards more', () => {
      service.setStrategy(new BonusMultiplierStrategy(2));
      // add 10+ participants to trigger bonus
      for (let i = 0; i < 9; i++) {
        const u = userService.register({ name: `U${i}`, email: `u${i}@eco.ua` });
        service.join(initiative.id, u.id);
      }
      service.start(initiative.id, organizer.id);
      const { pointsAwarded } = service.complete(initiative.id, organizer.id);
      expect(pointsAwarded).toBe(40);
    });
    test('complete sends reward notifications', () => {
      service.start(initiative.id, organizer.id);
      service.complete(initiative.id, organizer.id);
      expect(notif.getForUser(participant.id).some(n => n.type === 'reward')).toBe(true);
    });
    test('cancel sends warning notifications', () => {
      service.cancel(initiative.id, organizer.id);
      expect(notif.getForUser(participant.id).some(n => n.type === 'warning')).toBe(true);
    });
  });

  describe('setStrategy', () => {
    test('sets valid strategy', () => { expect(() => service.setStrategy(new BonusMultiplierStrategy())).not.toThrow(); });
    test('throws for invalid strategy', () => { expect(() => service.setStrategy({ bad: true })).toThrow('Invalid strategy'); });
    test('throws for null', () => { expect(() => service.setStrategy(null)).toThrow('Invalid strategy'); });
  });

  describe('list methods', () => {
    beforeEach(() => {
      const i = service.create({ title: 'T', organizerId: organizer.id, maxParticipants: 10 });
      service.publish(i.id, organizer.id);
    });
    test('listOpen', () => { expect(service.listOpen().length).toBe(1); });
    test('listByOrganizer', () => { expect(service.listByOrganizer(organizer.id).length).toBe(1); });
    test('listAll', () => { expect(service.listAll().length).toBe(1); });
    test('listByCategory', () => {
      service.create({ title: 'P', organizerId: organizer.id, maxParticipants: 5, category: 'planting' });
      expect(service.listByCategory('planting').length).toBe(1);
    });
    test('listByParticipant', () => {
      const i = service.listOpen()[0];
      service.join(i.id, participant.id);
      expect(service.listByParticipant(participant.id).length).toBe(1);
    });
    test('getById throws for missing', () => { expect(() => service.getById('ghost')).toThrow('not found'); });
  });
});
