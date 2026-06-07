// Strategy Pattern (GoF) — різні алгоритми нарахування балів

class BasePointsStrategy {
  calculate(basePoints, context) {
    throw new Error('calculate() must be implemented');
  }

  getName() {
    throw new Error('getName() must be implemented');
  }
}

// Стандартна стратегія — 1:1
class StandardPointsStrategy extends BasePointsStrategy {
  calculate(basePoints) {
    if (basePoints < 0) throw new Error('Points cannot be negative');
    return basePoints;
  }

  getName() {
    return 'standard';
  }
}

// Множник за велику кількість учасників
class BonusMultiplierStrategy extends BasePointsStrategy {
  constructor(multiplier = 1.5) {
    super();
    if (multiplier <= 0) throw new Error('Multiplier must be positive');
    this.multiplier = multiplier;
  }

  calculate(basePoints, context = {}) {
    if (basePoints < 0) throw new Error('Points cannot be negative');
    const participantCount = context.participantCount || 1;
    const bonus = participantCount >= 10 ? this.multiplier : 1;
    return Math.floor(basePoints * bonus);
  }

  getName() {
    return 'bonus_multiplier';
  }
}

// Прогресивна стратегія — більше учасників = більше балів
class ProgressivePointsStrategy extends BasePointsStrategy {
  calculate(basePoints, context = {}) {
    if (basePoints < 0) throw new Error('Points cannot be negative');
    const participantCount = context.participantCount || 1;
    let multiplier = 1;
    if (participantCount >= 50) multiplier = 2.0;
    else if (participantCount >= 20) multiplier = 1.5;
    else if (participantCount >= 10) multiplier = 1.25;
    return Math.floor(basePoints * multiplier);
  }

  getName() {
    return 'progressive';
  }
}

// Стратегія з бонусом за серію (streak)
class StreakBonusStrategy extends BasePointsStrategy {
  calculate(basePoints, context = {}) {
    if (basePoints < 0) throw new Error('Points cannot be negative');
    const streak = context.streak || 0;
    const streakBonus = Math.min(streak * 5, 50); // max +50 bonus
    return basePoints + streakBonus;
  }

  getName() {
    return 'streak_bonus';
  }
}

// Стратегія з штрафом (наприклад, якщо ініціатива не завершена)
class PenaltyStrategy extends BasePointsStrategy {
  constructor(penaltyPercent = 20) {
    super();
    if (penaltyPercent < 0 || penaltyPercent > 100) throw new Error('Penalty must be 0-100%');
    this.penaltyPercent = penaltyPercent;
  }

  calculate(basePoints, context = {}) {
    if (basePoints < 0) throw new Error('Points cannot be negative');
    const completed = context.completed !== false;
    if (!completed) {
      return Math.floor(basePoints * (1 - this.penaltyPercent / 100));
    }
    return basePoints;
  }

  getName() {
    return 'penalty';
  }
}

module.exports = {
  BasePointsStrategy,
  StandardPointsStrategy,
  BonusMultiplierStrategy,
  ProgressivePointsStrategy,
  StreakBonusStrategy,
  PenaltyStrategy,
};
