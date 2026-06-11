// Base repository interface (simulates Repository pattern)
class BaseRepository {
  constructor() {
    this._store = new Map();
  }

  save(entity) {
    if (!entity.id) throw new Error('Entity must have an id');
    this._store.set(entity.id, entity);
    return entity;
  }

  findById(id) {
    return this._store.get(id) || null;
  }

  findAll() {
    return Array.from(this._store.values());
  }

  delete(id) {
    const existed = this._store.has(id);
    this._store.delete(id);
    return existed;
  }

  count() {
    return this._store.size;
  }

  clear() {
    this._store.clear();
  }

  exists(id) {
    return this._store.has(id);
  }
}

class UserRepository extends BaseRepository {
  findByEmail(email) {
    return this.findAll().find(u => u.email === email.toLowerCase()) || null;
  }

  findByRole(role) {
    return this.findAll().filter(u => u.role === role);
  }

  findBlocked() {
    return this.findAll().filter(u => u.isBlocked);
  }

  findActive() {
    return this.findAll().filter(u => !u.isBlocked);
  }

  findTopByPoints(limit = 10) {
    return this.findAll()
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }
}

class InitiativeRepository extends BaseRepository {
  findByStatus(status) {
    return this.findAll().filter(i => i.status === status);
  }

  findByOrganizer(organizerId) {
    return this.findAll().filter(i => i.organizerId === organizerId);
  }

  findByCategory(category) {
    return this.findAll().filter(i => i.category === category);
  }

  findOpen() {
    return this.findAll().filter(i => i.status === 'open' && !i.isFull());
  }

  findByParticipant(userId) {
    return this.findAll().filter(i => i.participants.includes(userId));
  }
}

class MapPointRepository extends BaseRepository {
  findByCategory(category) {
    return this.findAll().filter(p => p.category === category);
  }

  findByInitiative(initiativeId) {
    return this.findAll().filter(p => p.initiativeId === initiativeId);
  }

  findNearby(lat, lng, radiusKm) {
    return this.findAll().filter(p => {
      const dLat = this._toRad(p.lat - lat);
      const dLng = this._toRad(p.lng - lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(this._toRad(lat)) * Math.cos(this._toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return dist <= radiusKm;
    });
  }

  _toRad(deg) {
    return (deg * Math.PI) / 180;
  }
}

class EventRepository extends BaseRepository {
  findByInitiative(initiativeId) {
    return this.findAll().filter(e => e.initiativeId === initiativeId);
  }

  findUpcoming() {
    return this.findAll().filter(e => e.isUpcoming());
  }

  findByDateRange(from, to) {
    return this.findAll().filter(e => e.startDate >= from && e.startDate <= to);
  }

  findByAttendee(userId) {
    return this.findAll().filter(e => e.attendees.includes(userId));
  }
}

class PrizeRepository extends BaseRepository {
  findAvailable() {
    return this.findAll().filter(p => p.isAvailable());
  }

  findByMaxCost(maxPoints) {
    return this.findAll().filter(p => p.pointsCost <= maxPoints);
  }

  findByCategory(category) {
    return this.findAll().filter(p => p.category === category);
  }
}

module.exports = {
  BaseRepository,
  UserRepository,
  InitiativeRepository,
  MapPointRepository,
  EventRepository,
  PrizeRepository,
};
