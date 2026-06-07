class Prize {
  constructor({ id, name, description = '', pointsCost, quantity, category = 'eco' }) {
    if (!id) throw new Error('Prize id is required');
    if (!name || name.trim() === '') throw new Error('Prize name is required');
    if (pointsCost === undefined || pointsCost === null) throw new Error('Points cost is required');
    if (pointsCost <= 0) throw new Error('Points cost must be positive');
    if (quantity !== undefined && quantity < 0) throw new Error('Quantity cannot be negative');

    this.id = id;
    this.name = name.trim();
    this.description = description;
    this.pointsCost = pointsCost;
    this.quantity = quantity !== undefined ? quantity : Infinity;
    this.category = category;
    this.claimedBy = [];
    this.createdAt = new Date();
  }

  isAvailable() {
    return this.quantity === Infinity || this.claimedBy.length < this.quantity;
  }

  remainingCount() {
    if (this.quantity === Infinity) return Infinity;
    return Math.max(0, this.quantity - this.claimedBy.length);
  }

  claim(userId) {
    if (!this.isAvailable()) throw new Error('Prize is out of stock');
    if (this.claimedBy.includes(userId)) throw new Error('User already claimed this prize');
    this.claimedBy.push(userId);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      pointsCost: this.pointsCost,
      quantity: this.quantity === Infinity ? null : this.quantity,
      category: this.category,
      remaining: this.remainingCount() === Infinity ? null : this.remainingCount(),
      claimedBy: [...this.claimedBy],
    };
  }
}

module.exports = Prize;
