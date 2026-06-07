class MapPoint {
  constructor({ id, lat, lng, title, description = '', category = 'cleanup', createdBy }) {
    if (!id) throw new Error('MapPoint id is required');
    if (lat === undefined || lat === null) throw new Error('Latitude is required');
    if (lng === undefined || lng === null) throw new Error('Longitude is required');
    if (lat < -90 || lat > 90) throw new Error('Latitude must be between -90 and 90');
    if (lng < -180 || lng > 180) throw new Error('Longitude must be between -180 and 180');
    if (!title || title.trim() === '') throw new Error('Title is required');
    if (!createdBy) throw new Error('CreatedBy is required');

    const validCategories = ['cleanup', 'planting', 'recycling', 'awareness', 'other'];
    if (!validCategories.includes(category)) throw new Error(`Category must be one of: ${validCategories.join(', ')}`);

    this.id = id;
    this.lat = lat;
    this.lng = lng;
    this.title = title.trim();
    this.description = description;
    this.category = category;
    this.createdBy = createdBy;
    this.initiativeId = null;
    this.createdAt = new Date();
  }

  attachToInitiative(initiativeId) {
    if (!initiativeId) throw new Error('Initiative id is required');
    this.initiativeId = initiativeId;
  }

  distanceTo(otherPoint) {
    const R = 6371;
    const dLat = this._toRad(otherPoint.lat - this.lat);
    const dLng = this._toRad(otherPoint.lng - this.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(this.lat)) *
        Math.cos(this._toRad(otherPoint.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  _toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  toJSON() {
    return {
      id: this.id,
      lat: this.lat,
      lng: this.lng,
      title: this.title,
      description: this.description,
      category: this.category,
      createdBy: this.createdBy,
      initiativeId: this.initiativeId,
    };
  }
}

module.exports = MapPoint;
