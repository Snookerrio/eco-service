const CalendarService = require('../../src/services/CalendarService');
const GamificationService = require('../../src/services/GamificationService');
const UserService = require('../../src/services/UserService');
const InitiativeService = require('../../src/services/InitiativeService');
const { UserRepository, InitiativeRepository, EventRepository, PrizeRepository } = require('../../src/storage/repositories');
const { NotificationService } = require('../../src/utils/notificationService');
const { StandardPointsStrategy } = require('../../src/utils/pointsStrategies');
const { resetCounters } = require('../../src/utils/idGenerator');

function buildServices() {
  resetCounters();
  const userRepo = new UserRepository();
  const initRepo = new InitiativeRepository();
  const eventRepo = new EventRepository();
  const prizeRepo = new PrizeRepository();
  const notif = new NotificationService();
  const userService = new UserService(userRepo, notif);
  const initService = new InitiativeService(initRepo, userRepo, new StandardPointsStrategy(), notif);
  const calendarService = new CalendarService(eventRepo, initRepo, userRepo, notif);
  const gamificationService = new GamificationService(prizeRepo, userRepo, notif);
  return { userRepo, initRepo, eventRepo, prizeRepo, notif, userService, initService, calendarService, gamificationService };
}

describe('CalendarService', () => {
  let s, organizer, participant, admin, initiative;
  const future1 = new Date(Date.now() + 86400000);
  const future2 = new Date(Date.now() + 172800000);

  beforeEach(() => {
    s = buildServices();
    admin = s.userService.register({ name: 'Admin', email: 'admin@eco.ua', role: 'admin' });
    organizer = s.userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
    participant = s.userService.register({ name: 'P', email: 'p@eco.ua' });
    initiative = s.initService.create({ title: 'T', organizerId: organizer.id, maxParticipants: 10 });
    s.initService.publish(initiative.id, organizer.id);
    s.initService.join(initiative.id, participant.id);
  });

  describe('constructor', () => {
    test('throws without eventRepo', () => { expect(() => new CalendarService()).toThrow('EventRepository is required'); });
  });

  describe('createEvent', () => {
    test('organizer can create event', () => {
      const e = s.calendarService.createEvent({ title: 'Акція', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      expect(e.title).toBe('Акція');
    });
    test('notifies participants', () => {
      s.calendarService.createEvent({ title: 'Акція', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      expect(s.notif.getForUser(participant.id).some(n => n.type === 'event')).toBe(true);
    });
    test('blocked organizer cannot create', () => {
      s.userService.blockUser(admin.id, organizer.id);
      expect(() => s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 })).toThrow('Blocked');
    });
    test('stranger cannot create for initiative', () => {
      const stranger = s.userService.register({ name: 'S', email: 's@eco.ua', role: 'organizer' });
      expect(() => s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: stranger.id, startDate: future1, endDate: future2 })).toThrow('initiative organizer');
    });
    test('admin can create for any initiative', () => {
      expect(() => s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: admin.id, startDate: future1, endDate: future2 })).not.toThrow();
    });
    test('throws for unknown initiative', () => {
      expect(() => s.calendarService.createEvent({ title: 'E', initiativeId: 'ghost', organizerId: organizer.id, startDate: future1, endDate: future2 })).toThrow('Initiative not found');
    });
    test('adds event to initiative', () => {
      const e = s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      expect(initiative.events).toContain(e.id);
    });
  });

  describe('rsvp / cancelRsvp', () => {
    let event;
    beforeEach(() => {
      event = s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
    });
    test('rsvp adds attendee', () => {
      s.calendarService.rsvp(event.id, participant.id);
      expect(event.attendees).toContain(participant.id);
    });
    test('rsvp sends notification', () => {
      s.calendarService.rsvp(event.id, participant.id);
      expect(s.notif.getForUser(participant.id).some(n => n.message.includes('registered'))).toBe(true);
    });
    test('blocked user cannot rsvp', () => {
      s.userService.blockUser(admin.id, participant.id);
      expect(() => s.calendarService.rsvp(event.id, participant.id)).toThrow('Blocked');
    });
    test('cancelRsvp removes attendee', () => {
      s.calendarService.rsvp(event.id, participant.id);
      s.calendarService.cancelRsvp(event.id, participant.id);
      expect(event.attendees).not.toContain(participant.id);
    });
    test('throws for unknown user', () => { expect(() => s.calendarService.rsvp(event.id, 'ghost')).toThrow('User not found'); });
  });

  describe('cancelEvent', () => {
    let event;
    beforeEach(() => {
      event = s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      s.calendarService.rsvp(event.id, participant.id);
    });
    test('organizer can cancel', () => { s.calendarService.cancelEvent(event.id, organizer.id); expect(event.isCancelled).toBe(true); });
    test('notifies attendees', () => {
      s.calendarService.cancelEvent(event.id, organizer.id);
      expect(s.notif.getForUser(participant.id).some(n => n.type === 'warning')).toBe(true);
    });
    test('non-organizer cannot cancel', () => { expect(() => s.calendarService.cancelEvent(event.id, participant.id)).toThrow('Not authorized'); });
    test('throws for unknown event', () => { expect(() => s.calendarService.cancelEvent('ghost', organizer.id)).toThrow('not found'); });
  });

  describe('list methods', () => {
    test('listUpcoming', () => {
      s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      expect(s.calendarService.listUpcoming().length).toBe(1);
    });
    test('listByInitiative', () => {
      s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      expect(s.calendarService.listByInitiative(initiative.id).length).toBe(1);
    });
    test('listByDateRange', () => {
      s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      const from = new Date(Date.now());
      const to = new Date(Date.now() + 200000000);
      expect(s.calendarService.listByDateRange(from, to).length).toBe(1);
    });
    test('listByDateRange throws for invalid dates', () => {
      expect(() => s.calendarService.listByDateRange('x', 'y')).toThrow('must be Date objects');
    });
    test('listByDateRange throws if from > to', () => {
      expect(() => s.calendarService.listByDateRange(new Date(Date.now() + 100), new Date())).toThrow('before to');
    });
    test('listByAttendee', () => {
      const e = s.calendarService.createEvent({ title: 'E', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      s.calendarService.rsvp(e.id, participant.id);
      expect(s.calendarService.listByAttendee(participant.id).length).toBe(1);
    });
    test('listAll', () => {
      s.calendarService.createEvent({ title: 'E1', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      s.calendarService.createEvent({ title: 'E2', initiativeId: initiative.id, organizerId: organizer.id, startDate: future1, endDate: future2 });
      expect(s.calendarService.listAll().length).toBe(2);
    });
  });
});

describe('GamificationService', () => {
  let s, user, admin, blockedUser;
  const prizeData = { name: 'Еко-торбинка', pointsCost: 50, quantity: 5 };

  beforeEach(() => {
    s = buildServices();
    admin = s.userService.register({ name: 'Admin', email: 'admin@eco.ua', role: 'admin' });
    user = s.userService.register({ name: 'User', email: 'user@eco.ua' });
    blockedUser = s.userService.register({ name: 'Blocked', email: 'blocked@eco.ua' });
    s.userService.blockUser(admin.id, blockedUser.id);
    s.userService.awardPoints(user.id, 200);
  });

  describe('constructor', () => {
    test('throws without prizeRepo', () => { expect(() => new GamificationService()).toThrow('PrizeRepository is required'); });
    test('throws without userRepo', () => { expect(() => new GamificationService(s.prizeRepo)).toThrow('UserRepository is required'); });
  });

  describe('addPrize', () => {
    test('creates prize', () => {
      const p = s.gamificationService.addPrize(prizeData);
      expect(p.name).toBe('Еко-торбинка');
      expect(p.pointsCost).toBe(50);
    });
    test('throws with empty name', () => { expect(() => s.gamificationService.addPrize({ name: '', pointsCost: 10 })).toThrow('name is required'); });
    test('throws with non-positive cost', () => { expect(() => s.gamificationService.addPrize({ name: 'X', pointsCost: 0 })).toThrow('must be positive'); });
  });

  describe('redeemPrize', () => {
    test('redeems and deducts points', () => {
      const p = s.gamificationService.addPrize(prizeData);
      s.gamificationService.redeemPrize(p.id, user.id);
      expect(user.points).toBe(150);
    });
    test('user receives prize', () => {
      const p = s.gamificationService.addPrize(prizeData);
      s.gamificationService.redeemPrize(p.id, user.id);
      expect(user.prizes).toContain(p.id);
    });
    test('sends notification', () => {
      const p = s.gamificationService.addPrize(prizeData);
      s.gamificationService.redeemPrize(p.id, user.id);
      expect(s.notif.getForUser(user.id).some(n => n.type === 'prize')).toBe(true);
    });
    test('throws for insufficient points', () => {
      const p = s.gamificationService.addPrize({ name: 'X', pointsCost: 1000 });
      expect(() => s.gamificationService.redeemPrize(p.id, user.id)).toThrow('Insufficient');
    });
    test('throws for blocked user', () => {
      const p = s.gamificationService.addPrize(prizeData);
      s.userService.awardPoints(blockedUser.id, 100);
      expect(() => s.gamificationService.redeemPrize(p.id, blockedUser.id)).toThrow('Blocked');
    });
    test('throws for out-of-stock prize', () => {
      const p = s.gamificationService.addPrize({ name: 'X', pointsCost: 10, quantity: 1 });
      s.gamificationService.redeemPrize(p.id, user.id);
      const user2 = s.userService.register({ name: 'U2', email: 'u2@eco.ua' });
      s.userService.awardPoints(user2.id, 100);
      expect(() => s.gamificationService.redeemPrize(p.id, user2.id)).toThrow('out of stock');
    });
    test('throws for unknown prize', () => { expect(() => s.gamificationService.redeemPrize('ghost', user.id)).toThrow('not found'); });
    test('throws for unknown user', () => {
      const p = s.gamificationService.addPrize(prizeData);
      expect(() => s.gamificationService.redeemPrize(p.id, 'ghost')).toThrow('not found');
    });
  });

  describe('list methods', () => {
    test('listAvailablePrizes', () => {
      s.gamificationService.addPrize(prizeData);
      expect(s.gamificationService.listAvailablePrizes().length).toBe(1);
    });
    test('listAffordablePrizes filters by user points', () => {
      s.gamificationService.addPrize({ name: 'Cheap', pointsCost: 10 });
      s.gamificationService.addPrize({ name: 'Expensive', pointsCost: 500 });
      expect(s.gamificationService.listAffordablePrizes(user.id).length).toBe(1);
    });
    test('listAffordablePrizes throws for unknown user', () => {
      expect(() => s.gamificationService.listAffordablePrizes('ghost')).toThrow('not found');
    });
    test('listByCategory', () => {
      s.gamificationService.addPrize({ ...prizeData, category: 'food' });
      expect(s.gamificationService.listByCategory('food').length).toBe(1);
    });
    test('listAll', () => {
      s.gamificationService.addPrize(prizeData);
      s.gamificationService.addPrize({ name: 'B', pointsCost: 20 });
      expect(s.gamificationService.listAll().length).toBe(2);
    });
  });

  describe('updatePrize', () => {
    test('updates name', () => {
      const p = s.gamificationService.addPrize(prizeData);
      s.gamificationService.updatePrize(p.id, { name: 'New Name' });
      expect(p.name).toBe('New Name');
    });
    test('updates pointsCost', () => {
      const p = s.gamificationService.addPrize(prizeData);
      s.gamificationService.updatePrize(p.id, { pointsCost: 100 });
      expect(p.pointsCost).toBe(100);
    });
    test('throws for empty name', () => {
      const p = s.gamificationService.addPrize(prizeData);
      expect(() => s.gamificationService.updatePrize(p.id, { name: '' })).toThrow('cannot be empty');
    });
    test('throws for non-positive cost', () => {
      const p = s.gamificationService.addPrize(prizeData);
      expect(() => s.gamificationService.updatePrize(p.id, { pointsCost: 0 })).toThrow('must be positive');
    });
    test('throws for unknown prize', () => { expect(() => s.gamificationService.updatePrize('ghost', {})).toThrow('not found'); });
  });

  describe('removePrize', () => {
    test('removes prize', () => {
      const p = s.gamificationService.addPrize(prizeData);
      expect(s.gamificationService.removePrize(p.id)).toBe(true);
    });
    test('throws for unknown prize', () => { expect(() => s.gamificationService.removePrize('ghost')).toThrow('not found'); });
  });
});
