const { createApp } = require('../../src/app');
const { resetCounters } = require('../../src/utils/idGenerator');
const { BonusMultiplierStrategy, ProgressivePointsStrategy, StreakBonusStrategy } = require('../../src/utils/pointsStrategies');

describe('Integration: Full EcoService Scenarios', () => {
  let app;
  beforeEach(() => {
    resetCounters();
    app = createApp();
  });

  describe('Scenario 1: Complete lifecycle - initiative creation to completion with prizes', () => {
    test('full happy path', () => {
      const { userService, initiativeService, gamificationService, notifService } = app;

      // 1. Register users
      const admin = userService.register({ name: 'Admin', email: 'admin@eco.ua', role: 'admin' });
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const p1 = userService.register({ name: 'P1', email: 'p1@eco.ua' });
      const p2 = userService.register({ name: 'P2', email: 'p2@eco.ua' });

      // 2. Create and publish initiative
      const init = initiativeService.create({ title: 'Парк Франка', organizerId: org.id, maxParticipants: 20, pointsReward: 30 });
      initiativeService.publish(init.id, org.id);
      expect(init.status).toBe('open');

      // 3. Participants join
      initiativeService.join(init.id, p1.id);
      initiativeService.join(init.id, p2.id);
      expect(init.participantCount()).toBe(2);

      // 4. Start and complete
      initiativeService.start(init.id, org.id);
      initiativeService.complete(init.id, org.id);
      expect(p1.points).toBe(30);
      expect(p2.points).toBe(30);

      // 5. Add prizes and redeem
      const prize = gamificationService.addPrize({ name: 'Еко-пляшка', pointsCost: 20 });
      gamificationService.redeemPrize(prize.id, p1.id);
      expect(p1.points).toBe(10);
      expect(p1.prizes).toContain(prize.id);

      // 6. Check leaderboard
      const lb = userService.getLeaderboard();
      expect(lb[0].userId).toBe(p2.id); // p2 still has 30 pts
    });
  });

  describe('Scenario 2: Map + Calendar integration', () => {
    test('initiative with map points and calendar events', () => {
      const { userService, initiativeService, mapService, calendarService } = app;
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const user = userService.register({ name: 'User', email: 'user@eco.ua' });
      const init = initiativeService.create({ title: 'Еко-Сихів', organizerId: org.id, maxParticipants: 50 });
      initiativeService.publish(init.id, org.id);
      initiativeService.join(init.id, user.id);

      // Add map points
      const mp1 = mapService.addPoint({ lat: 49.78, lng: 24.07, title: 'Сихів', createdBy: org.id, initiativeId: init.id });
      const mp2 = mapService.addPoint({ lat: 49.79, lng: 24.08, title: 'Кульпарків', createdBy: org.id, initiativeId: init.id });
      expect(init.mapPoints.length).toBe(2);

      // Create calendar event
      const future = new Date(Date.now() + 86400000);
      const future2 = new Date(Date.now() + 172800000);
      const event = calendarService.createEvent({ title: 'Збір учасників', initiativeId: init.id, organizerId: org.id, startDate: future, endDate: future2, location: 'Сихів' });
      calendarService.rsvp(event.id, user.id);

      expect(event.attendees).toContain(user.id);
      expect(mapService.findByInitiative(init.id).length).toBe(2);
      expect(calendarService.listByInitiative(init.id).length).toBe(1);

      // Find nearby
      const nearby = mapService.findNearby(49.78, 24.07, 5);
      expect(nearby.length).toBe(2);
    });
  });

  describe('Scenario 3: Blocking and access control', () => {
    test('blocked user cannot participate', () => {
      const { userService, initiativeService } = app;
      const admin = userService.register({ name: 'Admin', email: 'admin@eco.ua', role: 'admin' });
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const user = userService.register({ name: 'Bad', email: 'bad@eco.ua' });

      const init = initiativeService.create({ title: 'T', organizerId: org.id, maxParticipants: 10 });
      initiativeService.publish(init.id, org.id);

      userService.blockUser(admin.id, user.id);
      expect(() => initiativeService.join(init.id, user.id)).toThrow('Blocked');

      // Unblock and try again
      userService.unblockUser(admin.id, user.id);
      expect(() => initiativeService.join(init.id, user.id)).not.toThrow();
    });
  });

  describe('Scenario 4: Strategy pattern switching', () => {
    test('switch strategy mid-run affects completion', () => {
      const { userService, initiativeService } = app;
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const participants = [];
      for (let i = 0; i < 15; i++) {
        const u = userService.register({ name: `U${i}`, email: `u${i}@eco.ua` });
        participants.push(u);
      }

      const init = initiativeService.create({ title: 'T', organizerId: org.id, maxParticipants: 20, pointsReward: 10 });
      initiativeService.publish(init.id, org.id);
      participants.forEach(u => initiativeService.join(init.id, u.id));

      // Switch to progressive strategy before completing
      initiativeService.setStrategy(new ProgressivePointsStrategy());
      initiativeService.start(init.id, org.id);
      const { pointsAwarded } = initiativeService.complete(init.id, org.id);
      expect(pointsAwarded).toBe(12); // 15 participants => 1.25x => floor(12.5)=12
    });
  });

  describe('Scenario 5: Observer pattern - notifications', () => {
    test('all events generate notifications', () => {
      const { userService, initiativeService, notifService } = app;
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const user = userService.register({ name: 'User', email: 'user@eco.ua' });

      const notifsBefore = notifService.getForUser(user.id).length;
      const init = initiativeService.create({ title: 'T', organizerId: org.id, maxParticipants: 10 });
      initiativeService.publish(init.id, org.id); // triggers initiative notification
      initiativeService.join(init.id, user.id);   // triggers join notification
      initiativeService.start(init.id, org.id);   // triggers start notification
      initiativeService.complete(init.id, org.id); // triggers reward notification

      const notifsAfter = notifService.getForUser(user.id).length;
      expect(notifsAfter).toBeGreaterThan(notifsBefore);
      expect(notifService.getForUser(user.id).some(n => n.type === 'reward')).toBe(true);
    });
  });

  describe('Scenario 6: Gamification leaderboard', () => {
    test('leaderboard reflects multiple initiatives completed', () => {
      const { userService, initiativeService, gamificationService } = app;
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const star = userService.register({ name: 'Star', email: 'star@eco.ua' });
      const casual = userService.register({ name: 'Casual', email: 'casual@eco.ua' });

      for (let i = 0; i < 3; i++) {
        const init = initiativeService.create({ title: `Init${i}`, organizerId: org.id, maxParticipants: 10, pointsReward: 10 });
        initiativeService.publish(init.id, org.id);
        initiativeService.join(init.id, star.id);
        if (i === 0) initiativeService.join(init.id, casual.id);
        initiativeService.start(init.id, org.id);
        initiativeService.complete(init.id, org.id);
      }

      const lb = userService.getLeaderboard();
      expect(lb[0].name).toBe('Star');
      expect(lb[0].points).toBe(30);
      expect(lb[1].points).toBe(10);
    });

    test('affordable prizes update after spending', () => {
      const { userService, gamificationService } = app;
      const user = userService.register({ name: 'U', email: 'u@eco.ua' });
      userService.awardPoints(user.id, 100);
      gamificationService.addPrize({ name: 'Cheap', pointsCost: 20 });
      gamificationService.addPrize({ name: 'Mid', pointsCost: 60 });
      gamificationService.addPrize({ name: 'Expensive', pointsCost: 200 });

      const before = gamificationService.listAffordablePrizes(user.id);
      expect(before.length).toBe(2);

      const mid = gamificationService.listAll().find(p => p.name === 'Mid');
      gamificationService.redeemPrize(mid.id, user.id);

      const after = gamificationService.listAffordablePrizes(user.id);
      expect(after.length).toBe(1); // only cheap left
    });
  });

  describe('Scenario 7: Edge cases - capacity and concurrency', () => {
    test('initiative fills up correctly', () => {
      const { userService, initiativeService } = app;
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const init = initiativeService.create({ title: 'T', organizerId: org.id, maxParticipants: 3 });
      initiativeService.publish(init.id, org.id);

      for (let i = 0; i < 3; i++) {
        const u = userService.register({ name: `U${i}`, email: `u${i}@eco.ua` });
        initiativeService.join(init.id, u.id);
      }
      expect(init.isFull()).toBe(true);
      expect(initiativeService.listOpen()).not.toContain(init);
    });

    test('cancellation notifies all current participants', () => {
      const { userService, initiativeService, notifService } = app;
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const users = [];
      for (let i = 0; i < 5; i++) {
        const u = userService.register({ name: `U${i}`, email: `u${i}@eco.ua` });
        users.push(u);
      }
      const init = initiativeService.create({ title: 'T', organizerId: org.id, maxParticipants: 10 });
      initiativeService.publish(init.id, org.id);
      users.forEach(u => initiativeService.join(init.id, u.id));
      initiativeService.cancel(init.id, org.id);
      users.forEach(u => {
        expect(notifService.getForUser(u.id).some(n => n.type === 'warning')).toBe(true);
      });
    });
  });

  describe('Scenario 8: Streak bonus strategy', () => {
    test('rewards higher streaks with more points', () => {
      const { userService, initiativeService } = app;
      initiativeService.setStrategy(new StreakBonusStrategy());
      const org = userService.register({ name: 'Org', email: 'org@eco.ua', role: 'organizer' });
      const user = userService.register({ name: 'U', email: 'u@eco.ua' });
      const init = initiativeService.create({ title: 'T', organizerId: org.id, maxParticipants: 10, pointsReward: 20 });
      initiativeService.publish(init.id, org.id);
      initiativeService.join(init.id, user.id);
      initiativeService.start(init.id, org.id);
      const { pointsAwarded } = initiativeService.complete(init.id, org.id);
      expect(pointsAwarded).toBe(20); // no streak context = streak 0 = no bonus
    });
  });
});
