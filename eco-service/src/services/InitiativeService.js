const { Initiative } = require('../models/Initiative');
const { generateId } = require('../utils/idGenerator');

class InitiativeService {
  constructor(initiativeRepository, userRepository, pointsStrategy, notificationService) {
    if (!initiativeRepository) throw new Error('InitiativeRepository is required');
    if (!userRepository) throw new Error('UserRepository is required');
    this._initiatives = initiativeRepository;
    this._users = userRepository;
    this._strategy = pointsStrategy;
    this._notif = notificationService;
  }

  create({ title, description, organizerId, maxParticipants, pointsReward, category }) {
    const organizer = this._users.findById(organizerId);
    if (!organizer) throw new Error('Organizer not found');
    if (organizer.isBlocked) throw new Error('Blocked users cannot create initiatives');
    if (!organizer.isOrganizer() && !organizer.isAdmin()) throw new Error('Only organizers can create initiatives');

    const initiative = new Initiative({
      id: generateId('init'),
      title,
      description,
      organizerId,
      maxParticipants,
      pointsReward: pointsReward || 10,
      category,
    });
    this._initiatives.save(initiative);
    return initiative;
  }

  publish(initiativeId, organizerId) {
    const initiative = this._getOrThrow(initiativeId);
    this._checkOwnership(initiative, organizerId);
    initiative.publish();
    this._initiatives.save(initiative);
    // Notify all users
    if (this._notif) {
      this._users.findActive().forEach(u => {
        this._notif.notify(u.id, `New initiative available: "${initiative.title}"`, 'initiative');
      });
    }
    return initiative;
  }

  join(initiativeId, userId) {
    const initiative = this._getOrThrow(initiativeId);
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Blocked user cannot join initiatives');

    initiative.addParticipant(userId);
    user.joinInitiative(initiativeId);
    this._initiatives.save(initiative);
    this._users.save(user);

    if (this._notif) {
      this._notif.notify(userId, `You joined initiative: "${initiative.title}"`, 'info');
      this._notif.notify(initiative.organizerId, `${user.name} joined your initiative "${initiative.title}"`, 'info');
    }
    return initiative;
  }

  leave(initiativeId, userId) {
    const initiative = this._getOrThrow(initiativeId);
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');

    initiative.removeParticipant(userId);
    user.leaveInitiative(initiativeId);
    this._initiatives.save(initiative);
    this._users.save(user);
    return initiative;
  }

  start(initiativeId, organizerId) {
    const initiative = this._getOrThrow(initiativeId);
    this._checkOwnership(initiative, organizerId);
    initiative.start();
    this._initiatives.save(initiative);
    if (this._notif) {
      initiative.participants.forEach(uid => {
        this._notif.notify(uid, `Initiative "${initiative.title}" has started!`, 'info');
      });
    }
    return initiative;
  }

  complete(initiativeId, organizerId) {
    const initiative = this._getOrThrow(initiativeId);
    this._checkOwnership(initiative, organizerId);
    initiative.complete();

    // Award points to all participants using strategy
    const context = { participantCount: initiative.participants.length, completed: true };
    const points = this._strategy
      ? this._strategy.calculate(initiative.pointsReward, context)
      : initiative.pointsReward;

    initiative.participants.forEach(uid => {
      const user = this._users.findById(uid);
      if (user) {
        user.addPoints(points);
        this._users.save(user);
        if (this._notif) {
          this._notif.notify(uid, `Initiative completed! You earned ${points} points.`, 'reward');
        }
      }
    });

    this._initiatives.save(initiative);
    return { initiative, pointsAwarded: points };
  }

  cancel(initiativeId, organizerId) {
    const initiative = this._getOrThrow(initiativeId);
    this._checkOwnership(initiative, organizerId);
    initiative.cancel();
    this._initiatives.save(initiative);

    if (this._notif) {
      initiative.participants.forEach(uid => {
        this._notif.notify(uid, `Initiative "${initiative.title}" has been cancelled.`, 'warning');
      });
    }
    return initiative;
  }

  getById(id) {
    return this._getOrThrow(id);
  }

  listOpen() {
    return this._initiatives.findOpen();
  }

  listByCategory(category) {
    return this._initiatives.findByCategory(category);
  }

  listByOrganizer(organizerId) {
    return this._initiatives.findByOrganizer(organizerId);
  }

  listByParticipant(userId) {
    return this._initiatives.findByParticipant(userId);
  }

  listAll() {
    return this._initiatives.findAll();
  }

  setStrategy(strategy) {
    if (!strategy || typeof strategy.calculate !== 'function') {
      throw new Error('Invalid strategy');
    }
    this._strategy = strategy;
  }

  _getOrThrow(id) {
    const initiative = this._initiatives.findById(id);
    if (!initiative) throw new Error(`Initiative not found: ${id}`);
    return initiative;
  }

  _checkOwnership(initiative, userId) {
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');
    if (initiative.organizerId !== userId && !user.isAdmin()) {
      throw new Error('Only the organizer or admin can perform this action');
    }
  }
}

module.exports = InitiativeService;
