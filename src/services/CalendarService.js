const CalendarEvent = require('../models/CalendarEvent');
const { generateId } = require('../utils/idGenerator');

class CalendarService {
  constructor(eventRepository, initiativeRepository, userRepository, notificationService) {
    if (!eventRepository) throw new Error('EventRepository is required');
    this._events = eventRepository;
    this._initiatives = initiativeRepository;
    this._users = userRepository;
    this._notif = notificationService;
  }

  createEvent({ title, description, initiativeId, organizerId, startDate, endDate, location }) {
    const organizer = this._users.findById(organizerId);
    if (!organizer) throw new Error('Organizer not found');
    if (organizer.isBlocked) throw new Error('Blocked users cannot create events');

    const initiative = this._initiatives.findById(initiativeId);
    if (!initiative) throw new Error('Initiative not found');
    if (initiative.organizerId !== organizerId && !organizer.isAdmin()) {
      throw new Error('Only initiative organizer can create events for it');
    }

    const event = new CalendarEvent({ id: generateId('event'), title, description, initiativeId, organizerId, startDate, endDate, location });
    initiative.addEvent(event.id);
    this._initiatives.save(initiative);
    this._events.save(event);

    if (this._notif) {
      initiative.participants.forEach(uid => {
        this._notif.notify(uid, `New event scheduled: "${event.title}" on ${event.startDate.toDateString()}`, 'event');
      });
    }
    return event;
  }

  getById(id) {
    const e = this._events.findById(id);
    if (!e) throw new Error(`Event not found: ${id}`);
    return e;
  }

  rsvp(eventId, userId) {
    const event = this.getById(eventId);
    const user = this._users.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Blocked users cannot attend events');
    event.addAttendee(userId);
    this._events.save(event);
    if (this._notif) {
      this._notif.notify(userId, `You registered for event: "${event.title}"`, 'info');
    }
    return event;
  }

  cancelRsvp(eventId, userId) {
    const event = this.getById(eventId);
    event.removeAttendee(userId);
    this._events.save(event);
    return event;
  }

  cancelEvent(eventId, organizerId) {
    const event = this.getById(eventId);
    const user = this._users.findById(organizerId);
    if (!user) throw new Error('User not found');
    if (event.organizerId !== organizerId && !user.isAdmin()) throw new Error('Not authorized');
    event.cancel();
    this._events.save(event);
    if (this._notif) {
      event.attendees.forEach(uid => {
        this._notif.notify(uid, `Event "${event.title}" has been cancelled.`, 'warning');
      });
    }
    return event;
  }

  listUpcoming() {
    return this._events.findUpcoming();
  }

  listByInitiative(initiativeId) {
    return this._events.findByInitiative(initiativeId);
  }

  listByDateRange(from, to) {
    if (!(from instanceof Date) || !(to instanceof Date)) throw new Error('from and to must be Date objects');
    if (from > to) throw new Error('from must be before to');
    return this._events.findByDateRange(from, to);
  }

  listByAttendee(userId) {
    return this._events.findByAttendee(userId);
  }

  listAll() {
    return this._events.findAll();
  }
}

module.exports = CalendarService;
