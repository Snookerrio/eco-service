const STATUSES = ['draft', 'open', 'ongoing', 'completed', 'cancelled'];

class Initiative {
  constructor({ id, title, description = '', organizerId, status = 'draft', maxParticipants = 100, pointsReward = 10, category = 'cleanup' }) {
    if (!id) throw new Error('Initiative id is required');
    if (!title || title.trim() === '') throw new Error('Initiative title is required');
    if (!organizerId) throw new Error('Organizer id is required');
    if (maxParticipants <= 0) throw new Error('maxParticipants must be positive');
    if (pointsReward < 0) throw new Error('pointsReward cannot be negative');

    this.id = id;
    this.title = title.trim();
    this.description = description;
    this.organizerId = organizerId;
    this.status = status;
    this.maxParticipants = maxParticipants;
    this.pointsReward = pointsReward;
    this.category = category;
    this.participants = [];
    this.mapPoints = [];
    this.events = [];
    this.createdAt = new Date();
    this.completedAt = null;
  }

  addParticipant(userId) {
    if (this.status !== 'open') throw new Error('Initiative is not open for joining');
    if (this.participants.includes(userId)) throw new Error('User already participating');
    if (this.participants.length >= this.maxParticipants) throw new Error('Initiative is full');
    this.participants.push(userId);
  }

  removeParticipant(userId) {
    const idx = this.participants.indexOf(userId);
    if (idx === -1) throw new Error('User is not a participant');
    this.participants.splice(idx, 1);
  }

  publish() {
    if (this.status !== 'draft') throw new Error('Only draft initiatives can be published');
    this.status = 'open';
  }

  start() {
    if (this.status !== 'open') throw new Error('Only open initiatives can be started');
    this.status = 'ongoing';
  }

  complete() {
    if (this.status !== 'ongoing') throw new Error('Only ongoing initiatives can be completed');
    this.status = 'completed';
    this.completedAt = new Date();
  }

  cancel() {
    if (['completed', 'cancelled'].includes(this.status)) throw new Error('Cannot cancel this initiative');
    this.status = 'cancelled';
  }

  addMapPoint(mapPointId) {
    if (!this.mapPoints.includes(mapPointId)) {
      this.mapPoints.push(mapPointId);
    }
  }

  addEvent(eventId) {
    if (!this.events.includes(eventId)) {
      this.events.push(eventId);
    }
  }

  isFull() {
    return this.participants.length >= this.maxParticipants;
  }

  participantCount() {
    return this.participants.length;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      organizerId: this.organizerId,
      status: this.status,
      maxParticipants: this.maxParticipants,
      pointsReward: this.pointsReward,
      category: this.category,
      participants: [...this.participants],
      mapPoints: [...this.mapPoints],
      events: [...this.events],
      createdAt: this.createdAt,
      completedAt: this.completedAt,
    };
  }
}

module.exports = { Initiative, STATUSES };
