const {
  BaseRepository,
  UserRepository,
  InitiativeRepository,
  MapPointRepository,
  EventRepository,
  PrizeRepository,
} = require('../../src/storage/repositories');
const User = require('../../src/models/User');
const { Initiative } = require('../../src/models/Initiative');
const MapPoint = require('../../src/models/MapPoint');
const CalendarEvent = require('../../src/models/CalendarEvent');
const Prize = require('../../src/models/Prize');

describe('BaseRepository', () => {
  let repo;
  beforeEach(() => { repo = new BaseRepository(); });

  test('save and findById', () => { repo.save({ id: '1', val: 'x' }); expect(repo.findById('1').val).toBe('x'); });
  test('findById returns null for missing', () => { expect(repo.findById('nope')).toBeNull(); });
  test('findAll returns all', () => { repo.save({ id: '1' }); repo.save({ id: '2' }); expect(repo.findAll().length).toBe(2); });
  test('delete removes entity', () => { repo.save({ id: '1' }); repo.delete('1'); expect(repo.findById('1')).toBeNull(); });
  test('delete returns true if existed', () => { repo.save({ id: '1' }); expect(repo.delete('1')).toBe(true); });
  test('delete returns false if not existed', () => { expect(repo.delete('nope')).toBe(false); });
  test('count', () => { repo.save({ id: '1' }); repo.save({ id: '2' }); expect(repo.count()).toBe(2); });
  test('clear empties store', () => { repo.save({ id: '1' }); repo.clear(); expect(repo.count()).toBe(0); });
  test('exists true', () => { repo.save({ id: '1' }); expect(repo.exists('1')).toBe(true); });
  test('exists false', () => { expect(repo.exists('nope')).toBe(false); });
  test('save throws without id', () => { expect(() => repo.save({ val: 'x' })).toThrow('must have an id'); });
  test('overwrite with same id', () => { repo.save({ id: '1', v: 1 }); repo.save({ id: '1', v: 2 }); expect(repo.findById('1').v).toBe(2); });
});

describe('UserRepository', () => {
  let repo;
  beforeEach(() => { repo = new UserRepository(); });
  const makeUser = (id, email, role = 'participant', blocked = false) =>
    new User({ id, name: `User ${id}`, email, role, isBlocked: blocked, points: parseInt(id.replace(/\D/g, '')) || 0 });

  test('findByEmail', () => {
    const u = makeUser('u1', 'a@b.com'); repo.save(u);
    expect(repo.findByEmail('a@b.com').id).toBe('u1');
  });
  test('findByEmail case insensitive', () => {
    const u = makeUser('u1', 'a@b.com'); repo.save(u);
    expect(repo.findByEmail('A@B.COM').id).toBe('u1');
  });
  test('findByEmail returns null if not found', () => { expect(repo.findByEmail('no@no.com')).toBeNull(); });
  test('findByRole', () => {
    repo.save(makeUser('u1', 'a@b.com', 'organizer'));
    repo.save(makeUser('u2', 'b@b.com', 'participant'));
    expect(repo.findByRole('organizer').length).toBe(1);
  });
  test('findBlocked', () => {
    repo.save(makeUser('u1', 'a@b.com', 'participant', true));
    repo.save(makeUser('u2', 'b@b.com', 'participant', false));
    expect(repo.findBlocked().length).toBe(1);
  });
  test('findActive returns non-blocked', () => {
    repo.save(makeUser('u1', 'a@b.com', 'participant', false));
    repo.save(makeUser('u2', 'b@b.com', 'participant', true));
    expect(repo.findActive().length).toBe(1);
  });
  test('findTopByPoints ordered', () => {
    const u1 = new User({ id: 'u1', name: 'A', email: 'a@b.com', points: 50 });
    const u2 = new User({ id: 'u2', name: 'B', email: 'b@b.com', points: 100 });
    repo.save(u1); repo.save(u2);
    expect(repo.findTopByPoints(2)[0].id).toBe('u2');
  });
  test('findTopByPoints respects limit', () => {
    for (let i = 1; i <= 5; i++) repo.save(new User({ id: `u${i}`, name: `U${i}`, email: `u${i}@b.com`, points: i * 10 }));
    expect(repo.findTopByPoints(3).length).toBe(3);
  });
});

describe('InitiativeRepository', () => {
  let repo;
  beforeEach(() => { repo = new InitiativeRepository(); });
  const makeInit = (id, status = 'draft', category = 'cleanup', organizerId = 'u1') => {
    const i = new Initiative({ id, title: `T${id}`, organizerId, maxParticipants: 10 });
    if (status === 'open') i.publish();
    else if (status === 'ongoing') { i.publish(); i.start(); }
    return i;
  };

  test('findByStatus', () => {
    repo.save(makeInit('i1', 'open')); repo.save(makeInit('i2', 'draft'));
    expect(repo.findByStatus('open').length).toBe(1);
  });
  test('findByOrganizer', () => {
    repo.save(makeInit('i1', 'draft', 'cleanup', 'org1'));
    repo.save(makeInit('i2', 'draft', 'cleanup', 'org2'));
    expect(repo.findByOrganizer('org1').length).toBe(1);
  });
  test('findByCategory', () => {
    const i1 = new Initiative({ id: 'i1', title: 'T', organizerId: 'u1', maxParticipants: 5, category: 'planting' });
    repo.save(i1);
    expect(repo.findByCategory('planting').length).toBe(1);
  });
  test('findOpen excludes full', () => {
    const i = new Initiative({ id: 'i1', title: 'T', organizerId: 'u1', maxParticipants: 1 });
    i.publish(); i.addParticipant('u2');
    repo.save(i);
    expect(repo.findOpen().length).toBe(0);
  });
  test('findByParticipant', () => {
    const i = makeInit('i1', 'open');
    i.addParticipant('u5');
    repo.save(i);
    expect(repo.findByParticipant('u5').length).toBe(1);
    expect(repo.findByParticipant('u99').length).toBe(0);
  });
});

describe('MapPointRepository', () => {
  let repo;
  beforeEach(() => { repo = new MapPointRepository(); });
  const makePoint = (id, lat, lng, category = 'cleanup', initiativeId = null) => {
    const p = new MapPoint({ id, lat, lng, title: `P${id}`, createdBy: 'u1', category });
    if (initiativeId) p.attachToInitiative(initiativeId);
    return p;
  };

  test('findByCategory', () => {
    repo.save(makePoint('p1', 50, 24, 'planting'));
    repo.save(makePoint('p2', 50, 25, 'cleanup'));
    expect(repo.findByCategory('planting').length).toBe(1);
  });
  test('findByInitiative', () => {
    repo.save(makePoint('p1', 50, 24, 'cleanup', 'i1'));
    repo.save(makePoint('p2', 50, 25, 'cleanup'));
    expect(repo.findByInitiative('i1').length).toBe(1);
  });
  test('findNearby within radius', () => {
    repo.save(makePoint('p1', 49.84, 24.03)); // Lviv
    expect(repo.findNearby(49.84, 24.03, 1).length).toBe(1);
  });
  test('findNearby excludes far points', () => {
    repo.save(makePoint('p1', 50.45, 30.52)); // Kyiv
    expect(repo.findNearby(49.84, 24.03, 50).length).toBe(0);
  });
});

describe('EventRepository', () => {
  let repo;
  const future1 = new Date(Date.now() + 86400000);
  const future2 = new Date(Date.now() + 172800000);
  beforeEach(() => { repo = new EventRepository(); });
  const makeEvent = (id, initiativeId = 'i1') =>
    new CalendarEvent({ id, title: `E${id}`, initiativeId, organizerId: 'u1', startDate: future1, endDate: future2 });

  test('findByInitiative', () => {
    repo.save(makeEvent('e1', 'i1')); repo.save(makeEvent('e2', 'i2'));
    expect(repo.findByInitiative('i1').length).toBe(1);
  });
  test('findUpcoming', () => {
    repo.save(makeEvent('e1'));
    expect(repo.findUpcoming().length).toBe(1);
  });
  test('findUpcoming excludes cancelled', () => {
    const e = makeEvent('e1'); e.cancel(); repo.save(e);
    expect(repo.findUpcoming().length).toBe(0);
  });
  test('findByDateRange', () => {
    repo.save(makeEvent('e1'));
    const from = new Date(Date.now() + 3600000);
    const to = new Date(Date.now() + 200000000);
    expect(repo.findByDateRange(from, to).length).toBe(1);
  });
  test('findByAttendee', () => {
    const e = makeEvent('e1'); e.addAttendee('u5'); repo.save(e);
    expect(repo.findByAttendee('u5').length).toBe(1);
  });
});

describe('PrizeRepository', () => {
  let repo;
  beforeEach(() => { repo = new PrizeRepository(); });

  test('findAvailable includes unlimited', () => {
    repo.save(new Prize({ id: 'p1', name: 'X', pointsCost: 10 }));
    expect(repo.findAvailable().length).toBe(1);
  });
  test('findAvailable excludes out-of-stock', () => {
    const p = new Prize({ id: 'p1', name: 'X', pointsCost: 10, quantity: 1 });
    p.claim('u1'); repo.save(p);
    expect(repo.findAvailable().length).toBe(0);
  });
  test('findByMaxCost', () => {
    repo.save(new Prize({ id: 'p1', name: 'X', pointsCost: 50 }));
    repo.save(new Prize({ id: 'p2', name: 'Y', pointsCost: 200 }));
    expect(repo.findByMaxCost(100).length).toBe(1);
  });
  test('findByCategory', () => {
    repo.save(new Prize({ id: 'p1', name: 'X', pointsCost: 10, category: 'eco' }));
    repo.save(new Prize({ id: 'p2', name: 'Y', pointsCost: 10, category: 'food' }));
    expect(repo.findByCategory('eco').length).toBe(1);
  });
});
