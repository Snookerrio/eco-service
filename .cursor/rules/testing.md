# EcoService — Testing Strategy

## Framework
- **Jest** (Node.js, v29+)
- Coverage: Istanbul (built-in Jest v8 provider)
- XML Reports: jest-junit
- HTML Reports: coverage/lcov-report/index.html

## Running Tests

```bash
# Local development (HTML coverage report)
npm test

# CI mode (XML + LCOV for SonarQube)
npm run test:ci
```

## Test Structure
```
tests/
├── unit/
│   ├── User.test.js              # Model tests
│   ├── MapPoint.test.js
│   ├── Initiative.test.js
│   ├── CalendarEvent.test.js
│   ├── Prize.test.js
│   ├── repositories.test.js      # Repository layer
│   ├── pointsStrategies.test.js  # Strategy pattern
│   ├── notificationService.test.js # Observer pattern
│   ├── UserService.test.js       # Service layer
│   ├── InitiativeService.test.js
│   ├── MapService.test.js
│   └── services2.test.js         # Calendar + Gamification
└── integration/
    └── scenarios.test.js          # End-to-end scenarios
```

## Coverage Thresholds (enforced by Jest)
| Metric     | Minimum | Actual |
|------------|---------|--------|
| Statements | 70%     | ~97%   |
| Branches   | 70%     | ~92%   |
| Functions  | 70%     | ~98%   |
| Lines      | 70%     | ~98%   |

## Test Count
- **390+ tests** across 13 test suites
- Unit tests: ~350 (models, repos, services, utils)
- Integration tests: ~40 (full scenario walkthroughs)

## AI Rules for Test Generation
When generating new tests:
1. Always use `beforeEach` with `resetCounters()` to isolate test IDs
2. Test happy path, edge cases, and error paths for every public method
3. For services: test with real repositories (not mocks) for unit tests
4. For notifications: verify `notif.getForUser(id).some(...)` pattern
5. Use `jest.fn()` only when testing Observer subscriptions
6. Every `throw` in source must have a corresponding `toThrow()` test

## SonarQube Integration
Reports generated in:
- `coverage/lcov.info` → SonarQube LCOV input
- `reports/junit/junit.xml` → SonarQube test execution input
- `coverage/lcov-report/` → Human-readable HTML report

## jest-junit Config (via env vars in CI)
```
JEST_JUNIT_OUTPUT_DIR=./reports/junit
JEST_JUNIT_OUTPUT_NAME=junit.xml
```
