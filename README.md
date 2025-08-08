# LMK - Landing Page Builder

A modern landing page builder with visual editor powered by GrapesJS, team collaboration, and instant deployment.

## Features

- 🎨 **Visual Editor**: Drag and drop components with GrapesJS
- 👥 **Team Collaboration**: Workspaces with role-based access control
- 🚀 **Instant Deploy**: Deploy to Cloudflare Pages with custom domains
- 🔐 **Authentication**: Powered by Clerk for secure user management
- 📊 **MongoDB Storage**: Scalable data persistence
- 🧪 **Comprehensive Testing**: Jest with MongoDB test containers

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Domain-Driven Design (DDD)
- **Database**: MongoDB with Mongoose
- **Authentication**: Clerk
- **Testing**: Jest, MongoDB Memory Server
- **Deployment**: Vercel + Cloudflare Pages

## Architecture

This project follows **Domain-Driven Design (DDD)** with **Hexagonal Architecture**:

```
src/
├── domains/                 # Business domains
│   ├── user/               # User management
│   ├── workspace/          # Team workspaces
│   ├── project/            # Landing page projects
│   └── page/               # Individual pages with GrapesJS
├── adapters/               # External adapters
│   └── mongodb/            # MongoDB implementations
├── shared/                 # Shared utilities
└── app/                    # Next.js routes
```

## Testing Strategy

Tests mirror the project structure with comprehensive coverage:

```
tests/
├── adapters/mongodb/repositories/  # Integration tests
├── domains/                        # Unit tests with mocks
└── shared/                         # Test helpers
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm test -- --testNamePattern="UserService"
npm test -- --testNamePattern="MongoUserRepository"
```

## Getting Started

1. **Clone and install dependencies**:
   ```bash
   git clone <repository>
   cd lmk
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your Clerk credentials:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=lmk
   ```

3. **Set up Clerk**:
   - Create account at [clerk.com](https://clerk.com)
   - Create new project
   - Copy API keys to `.env.local`
   - Configure webhook endpoint: `http://localhost:3000/api/webhooks/clerk`
   - Enable events: `user.created`, `user.updated`, `user.deleted`

4. **Start MongoDB** (if running locally):
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or using Homebrew (macOS)
   brew install mongodb-community
   brew services start mongodb/brew/mongodb-community
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Run tests**:
   ```bash
   npm test
   ```

## Project Domains

### User Domain
- User management and authentication
- Profile management
- Clerk integration for auth sync

### Workspace Domain
- Team workspace management
- Member invitations and roles (Owner, Admin, Editor, Viewer)
- Workspace settings and permissions

### Project Domain
- Landing page project management
- Project status and visibility controls
- SEO settings and deployment configurations

### Page Domain
- Individual page management with GrapesJS
- Page versioning and history
- SEO metadata per page

## Development

### Adding New Features

1. **Define Domain**: Create entities, services, and repository interfaces
2. **Implement Adapters**: Add MongoDB repository implementation
3. **Write Tests**: Add unit tests for services and integration tests for repositories
4. **Create API Routes**: Add Next.js API endpoints
5. **Build UI**: Create React components with proper state management

### Testing Guidelines

- **Unit Tests**: Mock dependencies, test business logic
- **Integration Tests**: Use MongoDB Memory Server, test data persistence
- **Test Helpers**: Use provided utilities for creating test data
- **Coverage**: Aim for >80% coverage on business logic

### Code Quality

- **TypeScript**: Strict typing with proper interfaces
- **ESLint**: Automated code quality checks
- **Prettier**: Consistent code formatting
- **DDD Principles**: Clear separation of concerns

## Deployment

### Vercel Setup

1. Connect repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### Cloudflare Pages Integration

- Automatic deployment of landing pages
- Custom domain configuration
- CDN and performance optimization

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
