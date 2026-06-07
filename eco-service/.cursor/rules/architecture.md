# EcoService — Architecture

## Overview
In-Memory Node.js platform for ecological cleanup initiatives.

## Layer Structure

```
src/
├── models/          # Pure domain entities (no external deps)
│   ├── User.js
│   ├── Initiative.js
│   ├── MapPoint.js
│   ├── CalendarEvent.js
│   └── Prize.js
├── storage/         # In-Memory repositories (Map-based)
│   └── repositories.js  # BaseRepository + 5 domain repos
├── services/        # Business logic (DI via constructor)
│   ├── UserService.js
│   ├── InitiativeService.js
│   ├── MapService.js
│   ├── CalendarService.js
│   └── GamificationService.js
└── utils/           # GoF Patterns + helpers
    ├── pointsStrategies.js  # Strategy pattern
    ├── notificationService.js  # Observer pattern
    └── idGenerator.js
```

## GoF Patterns
- **Strategy**: `pointsStrategies.js` — Standard, BonusMultiplier, Progressive, StreakBonus, Penalty
- **Observer**: `NotificationService` extends `EventEmitter` — listens to domain events and pushes notifications
- **Repository**: `BaseRepository` + domain-specific extensions — abstracts data storage

## Data Flow
```
Request → Service.method(args)
  → UserRepository.findById(id)      [data access]
  → domain object manipulation       [business logic]
  → Repository.save(entity)          [persistence]
  → NotificationService.notify(...)  [side effects / Observer]
  → return result
```

## Dependency Injection Example
```js
const service = new InitiativeService(
  initiativeRepository,  // injected
  userRepository,        // injected
  pointsStrategy,        // injected (Strategy pattern)
  notificationService    // injected (Observer)
);
```

## Key Business Rules
- Users can be blocked; blocked users cannot join/create anything
- Initiatives: draft → open → ongoing → completed (one-way lifecycle)
- Points are awarded on initiative completion using the active Strategy
- Prizes cost points; users must have enough points to redeem
- Map points can be attached to initiatives and searched by proximity
- Calendar events belong to initiatives; attendees get notifications
