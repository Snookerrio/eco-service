const MapPoint = require('../models/MapPoint');
const { generateId } = require('../utils/idGenerator');

class MapService {
  constructor(mapPointRepository, initiativeRepository, userRepository) {
    if (!mapPointRepository) throw new Error('MapPointRepository is required');
    this._points = mapPointRepository;
    this._initiatives = initiativeRepository;
    this._users = userRepository;
  }

  addPoint({ lat, lng, title, description, category, createdBy, initiativeId }) {
    const user = this._users.findById(createdBy);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Blocked users cannot add map points');

    const point = new MapPoint({ id: generateId('point'), lat, lng, title, description, category, createdBy });

    if (initiativeId) {
      const initiative = this._initiatives.findById(initiativeId);
      if (!initiative) throw new Error('Initiative not found');
      point.attachToInitiative(initiativeId);
      initiative.addMapPoint(point.id);
      this._initiatives.save(initiative);
    }

    this._points.save(point);
    return point;
  }

  getById(id) {
    const p = this._points.findById(id);
    if (!p) throw new Error(`MapPoint not found: ${id}`);
    return p;
  }

  findNearby(lat, lng, radiusKm = 10) {
    if (radiusKm <= 0) throw new Error('Radius must be positive');
    return this._points.findNearby(lat, lng, radiusKm);
  }

  findByCategory(category) {
    return this._points.findByCategory(category);
  }

  findByInitiative(initiativeId) {
    return this._points.findByInitiative(initiativeId);
  }

  listAll() {
    return this._points.findAll();
  }

  deletePoint(pointId, userId) {
    const point = this.getById(pointId);
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');
    if (point.createdBy !== userId && !user.isAdmin()) throw new Error('Not authorized to delete this point');
    this._points.delete(pointId);
    return true;
  }

  updatePoint(pointId, userId, updates) {
    const point = this.getById(pointId);
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');
    if (point.createdBy !== userId && !user.isAdmin()) throw new Error('Not authorized to update this point');
    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim() === '') throw new Error('Title cannot be empty');
      point.title = updates.title.trim();
    }
    if (updates.description !== undefined) point.description = updates.description;
    if (updates.category !== undefined) {
      const valid = ['cleanup', 'planting', 'recycling', 'awareness', 'other'];
      if (!valid.includes(updates.category)) throw new Error('Invalid category');
      point.category = updates.category;
    }
    this._points.save(point);
    return point;
  }
}

module.exports = MapService;
