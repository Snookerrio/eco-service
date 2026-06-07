const Prize = require('../models/Prize');
const { generateId } = require('../utils/idGenerator');

class GamificationService {
  constructor(prizeRepository, userRepository, notificationService) {
    if (!prizeRepository) throw new Error('PrizeRepository is required');
    if (!userRepository) throw new Error('UserRepository is required');
    this._prizes = prizeRepository;
    this._users = userRepository;
    this._notif = notificationService;
  }

  addPrize({ name, description, pointsCost, quantity, category }) {
    if (!name || name.trim() === '') throw new Error('Prize name is required');
    if (!pointsCost || pointsCost <= 0) throw new Error('Points cost must be positive');
    const prize = new Prize({ id: generateId('prize'), name, description, pointsCost, quantity, category });
    this._prizes.save(prize);
    return prize;
  }

  getPrizeById(id) {
    const prize = this._prizes.findById(id);
    if (!prize) throw new Error(`Prize not found: ${id}`);
    return prize;
  }

  redeemPrize(prizeId, userId) {
    const prize = this._prizes.findById(prizeId);
    if (!prize) throw new Error('Prize not found');
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Blocked users cannot redeem prizes');
    if (user.points < prize.pointsCost) throw new Error(`Insufficient points. Need ${prize.pointsCost}, have ${user.points}`);
    if (!prize.isAvailable()) throw new Error('Prize is out of stock');

    prize.claim(userId);
    user.deductPoints(prize.pointsCost);
    user.claimPrize(prizeId);
    this._prizes.save(prize);
    this._users.save(user);

    if (this._notif) {
      this._notif.notify(userId, `You redeemed prize: "${prize.name}"! Remaining points: ${user.points}`, 'prize');
    }
    return { prize, user, pointsSpent: prize.pointsCost };
  }

  listAvailablePrizes() {
    return this._prizes.findAvailable();
  }

  listAffordablePrizes(userId) {
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');
    return this._prizes.findByMaxCost(user.points).filter(p => p.isAvailable());
  }

  listByCategory(category) {
    return this._prizes.findByCategory(category);
  }

  listAll() {
    return this._prizes.findAll();
  }

  getLeaderboard(userRepository, limit = 10) {
    return userRepository.findTopByPoints(limit).map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      name: u.name,
      points: u.points,
      prizeCount: u.prizes.length,
    }));
  }

  updatePrize(prizeId, updates) {
    const prize = this._prizes.findById(prizeId);
    if (!prize) throw new Error('Prize not found');
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim() === '') throw new Error('Name cannot be empty');
      prize.name = updates.name.trim();
    }
    if (updates.description !== undefined) prize.description = updates.description;
    if (updates.pointsCost !== undefined) {
      if (updates.pointsCost <= 0) throw new Error('Points cost must be positive');
      prize.pointsCost = updates.pointsCost;
    }
    if (updates.quantity !== undefined) {
      if (updates.quantity < 0) throw new Error('Quantity cannot be negative');
      prize.quantity = updates.quantity;
    }
    this._prizes.save(prize);
    return prize;
  }

  removePrize(prizeId) {
    const prize = this._prizes.findById(prizeId);
    if (!prize) throw new Error('Prize not found');
    this._prizes.delete(prizeId);
    return true;
  }
}

module.exports = GamificationService;
