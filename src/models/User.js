class User {
  constructor({ id, name, email, role = 'participant', points = 0, isBlocked = false }) {
    if (!id) throw new Error('User id is required');
    if (!name || name.trim() === '') throw new Error('User name is required');
    if (!email || !email.includes('@')) throw new Error('Invalid email');
    this.id = id;
    this.name = name.trim();
    this.email = email.toLowerCase().trim();
    this.role = role;
    this.points = points;
    this.isBlocked = isBlocked;
    this.joinedInitiatives = [];
    this.prizes = [];
    this.createdAt = new Date();
  }

  addPoints(amount) {
    if (amount <= 0) throw new Error('Points amount must be positive');
    this.points += amount;
  }

  deductPoints(amount) {
    if (amount <= 0) throw new Error('Points amount must be positive');
    if (this.points < amount) throw new Error('Insufficient points');
    this.points -= amount;
  }

  block() {
    this.isBlocked = true;
  }

  unblock() {
    this.isBlocked = false;
  }

  isOrganizer() {
    return this.role === 'organizer';
  }

  isAdmin() {
    return this.role === 'admin';
  }

  joinInitiative(initiativeId) {
    if (this.isBlocked) throw new Error('Blocked user cannot join initiatives');
    if (this.joinedInitiatives.includes(initiativeId)) throw new Error('Already joined this initiative');
    this.joinedInitiatives.push(initiativeId);
  }

  leaveInitiative(initiativeId) {
    const idx = this.joinedInitiatives.indexOf(initiativeId);
    if (idx === -1) throw new Error('User is not part of this initiative');
    this.joinedInitiatives.splice(idx, 1);
  }

  claimPrize(prizeId) {
    this.prizes.push(prizeId);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      points: this.points,
      isBlocked: this.isBlocked,
      joinedInitiatives: [...this.joinedInitiatives],
      prizes: [...this.prizes],
    };
  }
}

module.exports = User;
