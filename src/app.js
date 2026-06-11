const {
  UserRepository,
  InitiativeRepository,
  MapPointRepository,
  EventRepository,
  PrizeRepository,
} = require('./storage/repositories');
const { NotificationService } = require('./utils/notificationService');
const { StandardPointsStrategy } = require('./utils/pointsStrategies');
const UserService = require('./services/UserService');
const InitiativeService = require('./services/InitiativeService');
const MapService = require('./services/MapService');
const CalendarService = require('./services/CalendarService');
const GamificationService = require('./services/GamificationService');

function createApp() {
  const userRepo = new UserRepository();
  const initiativeRepo = new InitiativeRepository();
  const mapPointRepo = new MapPointRepository();
  const eventRepo = new EventRepository();
  const prizeRepo = new PrizeRepository();
  const notifService = new NotificationService();
  const pointsStrategy = new StandardPointsStrategy();

  const userService = new UserService(userRepo, notifService);
  const initiativeService = new InitiativeService(initiativeRepo, userRepo, pointsStrategy, notifService);
  const mapService = new MapService(mapPointRepo, initiativeRepo, userRepo);
  const calendarService = new CalendarService(eventRepo, initiativeRepo, userRepo, notifService);
  const gamificationService = new GamificationService(prizeRepo, userRepo, notifService);

  return {
    userService,
    initiativeService,
    mapService,
    calendarService,
    gamificationService,
    notifService,
    repositories: { userRepo, initiativeRepo, mapPointRepo, eventRepo, prizeRepo },
  };
}

module.exports = { createApp };
