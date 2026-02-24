## Testing Documentation

This document describes the testing setup for the Nero Party application.

## Backend Testing

### Unit Tests

Unit tests are located in `backend/src/__tests__/` and test utility functions in isolation.

**Run tests:**
```bash
cd backend
npm test
```

**Run tests in watch mode:**
```bash
npm run test:watch
```

**Run tests with coverage:**
```bash
npm run test:coverage
```

### Test Coverage

- `generatePartyCode()` - Ensures unique 6-character party codes
- `calculatePartyResult()` - Winner calculation with average scores and tiebreakers
- `checkPartyAutoEnd()` - Auto-end logic for song limits and time limits
- `getNextQueuedSong()` - Queue management

### Testing Framework

- **Jest** - Test runner and assertion library
- **ts-jest** - TypeScript support for Jest
- **Prisma mocking** - Mock database calls for isolated unit tests

## Frontend Testing

### Component Tests

Component tests are located in `frontend/src/__tests__/` and test React components.

**Run tests:**
```bash
cd frontend
npm test
```

**Run tests with UI:**
```bash
npm run test:ui
```

**Run tests with coverage:**
```bash
npm run test:coverage
```

### Test Coverage

- `PartyQRCode` - QR code rendering and URL generation

### Testing Framework

- **Vitest** - Fast unit test framework for Vite
- **React Testing Library** - Component testing utilities
- **jsdom** - DOM simulation for testing

## Continuous Integration

### GitHub Actions

The `.github/workflows/ci.yml` workflow runs automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Workflow includes:**
1. **Backend Tests** - Run all backend unit tests
2. **Frontend Tests** - Run all frontend component tests
3. **Type Checking** - TypeScript validation for both backend and frontend
4. **Build** - Ensure both projects build successfully

### Local CI Testing

To run the same checks locally before pushing:

```bash
# Backend
cd backend
npm ci
npx prisma generate
npm test
npm run build

# Frontend
cd ../frontend
npm ci
npm test -- --run
npm run build
```

## API Documentation

### OpenAPI Schema

The REST API is documented using OpenAPI 3.0 specification in `backend/openapi.yaml`.

**Endpoints documented:**
- `GET /health` - Health check
- `GET /api/youtube/search` - YouTube video search

### Viewing API Docs

You can view the OpenAPI schema using tools like:

- **Swagger UI**: https://editor.swagger.io/ (paste the YAML)
- **Redoc**: https://redocly.github.io/redoc/
- **VS Code OpenAPI extension**: Install "OpenAPI (Swagger) Editor" extension

### Socket.IO Events

Socket.IO real-time events are documented in the main README.md and WHATIVEDONE.md files, including:

**Client → Server Events:**
- `party:create`, `party:join`, `party:leave`, `party:start`, `party:end`
- `song:add`, `song:vote`, `song:next`, `song:skip`
- `participant:kick`
- `presence:heartbeat`

**Server → Client Events:**
- `party:started`, `party:ended`
- `participant:joined`, `participant:left`, `participant:kicked`
- `song:added`, `song:playing`, `song:ended`
- `playback:sync`, `vote:updated`
- `error`, `sync:state`

## Future Testing Enhancements

### Backend Integration Tests (Not Yet Implemented)

Planned integration tests for Socket.IO events:
- Party creation and joining flow
- Song addition and voting
- Host controls (skip, kick)
- Real-time synchronization

### Frontend E2E Tests (Not Yet Implemented)

Planned end-to-end tests using Playwright or Cypress:
- Complete user flow (create party → add songs → vote → see winner)
- Multi-user scenarios
- Mobile responsiveness

### Load Testing (Not Yet Implemented)

Planned performance tests:
- Concurrent parties (50+)
- Multiple participants per party (20+)
- High-frequency voting
- WebSocket connection stability

## Contributing

When adding new features:

1. Write unit tests for new utility functions
2. Write component tests for new React components
3. Update OpenAPI schema if adding REST endpoints
4. Ensure all tests pass locally before pushing
5. Check that GitHub Actions workflow passes
