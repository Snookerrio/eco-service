class CalendarEvent {
  constructor({ id, title, description = '', initiativeId, organizerId, startDate, endDate, location = '' }) {
    if (!id) throw new Error('Event id is required');
    if (!title || title.trim() === '') throw new Error('Event title is required');
    if (!initiativeId) throw new Error('Initiative id is required');
    if (!organizerId) throw new Error('Organizer id is required');
    if (!startDate) throw new Error('Start date is required');
    if (!endDate) throw new Error('End date is required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime())) throw new Error('Invalid start date');
    if (isNaN(end.getTime())) throw new Error('Invalid end date');
    if (end <= start) throw new Error('End date must be after start date');

    this.id = id;
    this.title = title.trim();
    this.description = description;
    this.initiativeId = initiativeId;
    this.organizerId = organizerId;
    this.startDate = start;
    this.endDate = end;
    this.location = location;
    this.attendees = [];
    this.isCancelled = false;
    this.createdAt = new Date();
  }

  addAttendee(userId) {
    if (this.isCancelled) throw new Error('Cannot join a cancelled event');
    if (this.attendees.includes(userId)) throw new Error('User already attending');
    this.attendees.push(userId);
  }

  removeAttendee(userId) {
    const idx = this.attendees.indexOf(userId);
    if (idx === -1) throw new Error('User is not attending this event');
    this.attendees.splice(idx, 1);
  }

  cancel() {
    if (this.isCancelled) throw new Error('Event is already cancelled');
    this.isCancelled = true;
  }

  isUpcoming() {
    return !this.isCancelled && this.startDate > new Date();
  }

  isOngoing() {
    const now = new Date();
    return !this.isCancelled && this.startDate <= now && this.endDate >= now;
  }

  isPast() {
    return this.endDate < new Date();
  }

  durationHours() {
    return (this.endDate - this.startDate) / (1000 * 60 * 60);
  }

  conflictsWith(otherEvent) {
    return this.startDate < otherEvent.endDate && this.endDate > otherEvent.startDate;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      initiativeId: this.initiativeId,
      organizerId: this.organizerId,
      startDate: this.startDate,
      endDate: this.endDate,
      location: this.location,
      attendees: [...this.attendees],
      isCancelled: this.isCancelled,
    };
  }
}

module.exports = CalendarEvent;
