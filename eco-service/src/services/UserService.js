const User = require('../models/User');
const { generateId } = require('../utils/idGenerator');

class UserService {
  constructor(userRepository, notificationService) {
    if (!userRepository) throw new Error('UserRepository is required');
    this._repo = userRepository;
    this._notif = notificationService;
  }

  register({ name, email, role = 'participant' }) {
    if (!name || name.trim() === '') throw new Error('Name is required');
    if (!email) throw new Error('Email is required');
    const existing = this._repo.findByEmail(email);
    if (existing) throw new Error('Email already registered');
    const validRoles = ['participant', 'organizer', 'admin'];
    if (!validRoles.includes(role)) throw new Error(`Invalid role: ${role}`);

    const user = new User({ id: generateId('user'), name, email, role });
    this._repo.save(user);
    if (this._notif) {
      this._notif.notify(user.id, `Welcome to EcoService, ${user.name}!`, 'welcome');
    }
    return user;
  }

  getById(id) {
    const user = this._repo.findById(id);
    if (!user) throw new Error(`User not found: ${id}`);
    return user;
  }

  getByEmail(email) {
    const user = this._repo.findByEmail(email);
    if (!user) throw new Error(`User not found with email: ${email}`);
    return user;
  }

  blockUser(adminId, targetUserId) {
    const admin = this._repo.findById(adminId);
    if (!admin || !admin.isAdmin()) throw new Error('Only admins can block users');
    const target = this._repo.findById(targetUserId);
    if (!target) throw new Error('Target user not found');
    if (target.isBlocked) throw new Error('User is already blocked');
    target.block();
    this._repo.save(target);
    if (this._notif) {
      this._notif.notify(targetUserId, 'Your account has been blocked.', 'warning');
    }
    return target;
  }

  unblockUser(adminId, targetUserId) {
    const admin = this._repo.findById(adminId);
    if (!admin || !admin.isAdmin()) throw new Error('Only admins can unblock users');
    const target = this._repo.findById(targetUserId);
    if (!target) throw new Error('Target user not found');
    if (!target.isBlocked) throw new Error('User is not blocked');
    target.unblock();
    this._repo.save(target);
    if (this._notif) {
      this._notif.notify(targetUserId, 'Your account has been unblocked.', 'info');
    }
    return target;
  }

  awardPoints(userId, amount, reason = '') {
    const user = this._repo.findById(userId);
    if (!user) throw new Error('User not found');
    user.addPoints(amount);
    this._repo.save(user);
    if (this._notif) {
      this._notif.notify(userId, `You earned ${amount} points! ${reason}`, 'reward');
    }
    return user;
  }

  deductPoints(userId, amount) {
    const user = this._repo.findById(userId);
    if (!user) throw new Error('User not found');
    user.deductPoints(amount);
    this._repo.save(user);
    return user;
  }

  getLeaderboard(limit = 10) {
    return this._repo.findTopByPoints(limit).map((u, idx) => ({
      rank: idx + 1,
      userId: u.id,
      name: u.name,
      points: u.points,
    }));
  }

  updateProfile(userId, { name, email }) {
    const user = this._repo.findById(userId);
    if (!user) throw new Error('User not found');
    if (name && name.trim() !== '') user.name = name.trim();
    if (email) {
      if (!email.includes('@')) throw new Error('Invalid email');
      const existing = this._repo.findByEmail(email);
      if (existing && existing.id !== userId) throw new Error('Email already in use');
      user.email = email.toLowerCase().trim();
    }
    this._repo.save(user);
    return user;
  }

  listAll() {
    return this._repo.findAll();
  }

  listActive() {
    return this._repo.findActive();
  }

  listBlocked() {
    return this._repo.findBlocked();
  }
}

module.exports = UserService;
