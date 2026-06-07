# 🌿 Еко-сервіс

[![CI/CD Pipeline](https://github.com/your-org/eco-service/actions/workflows/ci-pipeline.yml/badge.svg)](https://github.com/your-org/eco-service/actions/workflows/ci-pipeline.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=eco-service&metric=alert_status)](https://sonarcloud.io/project/overview?id=eco-service)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=eco-service&metric=coverage)](https://sonarcloud.io/project/overview?id=eco-service)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=eco-service&metric=bugs)](https://sonarcloud.io/project/overview?id=eco-service)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=eco-service&metric=code_smells)](https://sonarcloud.io/project/overview?id=eco-service)

> Node.js платформа для організації екологічних ініціатив з картами, календарем, учасниками та системою призів.

---

## 📋 Зміст

- [Опис проєкту](#опис-проєкту)
- [Архітектура](#архітектура)
- [GoF Патерни](#gof-патерни)
- [Структура репозиторію](#структура-репозиторію)
- [Встановлення](#встановлення)
- [Запуск тестів](#запуск-тестів)
- [CI/CD](#cicd)
- [SonarQube](#sonarqube)

---

## Опис проєкту

**Еко-сервіс** — це In-Memory платформа для координації екологічних прибирань та ініціатив. Система підтримує:

- 🗺️ **Карти** — географічні точки прибирань по категоріях (cleanup, planting, recycling)
- 📅 **Календар** — планування подій з RSVP та сповіщеннями
- 👥 **Учасники** — реєстрація, блокування, ролі (participant / organizer / admin)
- 🏆 **Призи** — гейміфікація через нарахування балів та обмін на призи
- 🔔 **Сповіщення** — Observer-паттерн для real-time повідомлень

---

## Архітектура

```
┌─────────────────────────────────────────────┐
│                   Services                   │
│  UserService  InitiativeService  MapService  │
│  CalendarService  GamificationService        │
├─────────────────────────────────────────────┤
│                  Storage                     │
│  BaseRepository → UserRepo, InitiativeRepo   │
│  MapPointRepo, EventRepo, PrizeRepo          │
├─────────────────────────────────────────────┤
│                   Models                     │
│  User  Initiative  MapPoint  CalendarEvent   │
│  Prize                                       │
├─────────────────────────────────────────────┤
│                    Utils                     │
│  PointsStrategies (Strategy GoF)             │
│  NotificationService (Observer GoF)          │
│  IdGenerator                                 │
└─────────────────────────────────────────────┘
```

### SOLID принципи
| Принцип | Реалізація |
|---------|-----------|
| **SRP** | Кожен сервіс відповідає за одну предметну область |
| **OCP** | Стратегії балів розширюються без зміни `InitiativeService` |
| **LSP** | Всі стратегії взаємозамінні через `BasePointsStrategy` |
| **ISP** | Репозиторії мають вузькоспеціалізовані інтерфейси |
| **DIP** | Всі залежності передаються через конструктор (DI) |

---

## GoF Патерни

### Strategy — `src/utils/pointsStrategies.js`
П'ять стратегій нарахування балів:

| Стратегія | Логіка |
|-----------|--------|
| `StandardPointsStrategy` | Базові бали 1:1 |
| `BonusMultiplierStrategy` | Множник при 10+ учасниках |
| `ProgressivePointsStrategy` | Прогресивний множник (1x → 2x) |
| `StreakBonusStrategy` | +5 балів за кожен streak (до +50) |
| `PenaltyStrategy` | Штраф % якщо ініціатива не завершена |

```js
// Переключення стратегії в runtime
initiativeService.setStrategy(new ProgressivePointsStrategy());
```

### Observer — `src/utils/notificationService.js`
`NotificationService` extends `EventEmitter` — підписники отримують сповіщення про всі доменні події.

```js
notificationService.on('notification', (n) => console.log(n));
notificationService.notify(userId, 'Ініціативу завершено!', 'reward');
```

### Repository — `src/storage/repositories.js`
`BaseRepository` з Map-сховищем + 5 доменних репозиторіїв з вузькоспеціалізованими методами пошуку.

---

## Структура репозиторію

```
eco-service/
├── src/
│   ├── models/           # Доменні сутності
│   ├── services/         # Бізнес-логіка
│   ├── storage/          # In-Memory репозиторії
│   ├── utils/            # Патерни + утиліти
│   └── app.js            # Фабрика сервісів
├── tests/
│   ├── unit/             # ~350 модульних тестів
│   └── integration/      # ~40 інтеграційних тестів
├── docs/
│   └── diagrams/         # UML діаграми
├── .cursor/rules/
│   ├── architecture.md
│   └── testing.md
├── .github/workflows/
│   └── ci-pipeline.yml   # GitHub Actions
├── .cursorrules          # AI правила
├── sonar-project.properties
├── Dockerfile
└── README.md
```

---

## Встановлення

```bash
git clone https://github.com/your-org/eco-service.git
cd eco-service
npm install
```

---

## Запуск тестів

```bash
# Запуск з HTML звітом покриття
npm test

# CI режим (XML + LCOV для SonarQube)
npm run test:ci

# Watch режим
npm run test:watch
```

### Результати тестування
| Метрика | Значення |
|---------|---------|
| Всього тестів | **390+** |
| Test Suites | **13** |
| Coverage (Statements) | **~97%** |
| Coverage (Branches) | **~92%** |
| Coverage (Functions) | **~98%** |
| Bugs | **0** |

Після запуску `npm test` HTML звіт доступний у `coverage/lcov-report/index.html`.

---

## CI/CD

Кожен `push` та `pull_request` запускає пайплайн:

```
push/PR → Install → Test & Coverage → Upload Artifacts → SonarCloud Scan
```

### Артефакти збірки
Після кожного запуску пайплайну доступні для завантаження:
- `junit-test-results` — `reports/junit/junit.xml`
- `coverage-html-report` — HTML сторінки з непокритими рядками
- `coverage-lcov` — `coverage/lcov.info` для SonarQube

### Branch Protection
Pull Request не може бути прийнятий якщо:
- Пайплайн "червоний"
- Quality Gate провалено (coverage < 70%)

---

## SonarQube

Проєкт інтегровано з **SonarCloud**. Quality Gate вимоги:

| Метрика | Поріг | Статус |
|---------|-------|--------|
| Code Coverage | ≥ 70% | ✅ ~97% |
| Bugs | 0 | ✅ 0 |
| Vulnerabilities | 0 | ✅ 0 |
| Code Smells | A або B | ✅ A |

Конфігурація: `sonar-project.properties`

---

## Docker

```bash
# Запуск тестів в ізольованому середовищі
docker build --target test -t eco-service-test .
docker run eco-service-test
```
