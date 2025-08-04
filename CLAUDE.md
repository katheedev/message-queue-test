# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Aero Ops Testing Suite**, a React-based web application for testing SpringBoot Kafka & JMS message consumers in aerospace operations. The application provides a comprehensive interface for configuring, testing, and monitoring message consumers for both Kafka and JMS systems.

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: React hooks + TanStack Query
- **Routing**: React Router DOM
- **Form Handling**: React Hook Form with Zod validation
- **Development**: ESLint, TypeScript strict mode disabled

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development environment  
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Project Architecture

### Core Application Structure

- **Entry Point**: `src/main.tsx` → `src/App.tsx`
- **Routing**: Single-page app with React Router, main route is `/` → `src/pages/Index.tsx`
- **Global Providers**: QueryClient, TooltipProvider, Toast notifications

### Component Architecture

The application follows a tab-based interface with these main sections:

1. **Consumer Overview** (`src/components/ConsumerOverview.tsx`)
   - Displays hardcoded lists of Kafka and JMS consumers
   - Shows consumer status (active/inactive/error) and last tested timestamps
   - Provides test and configuration actions for each consumer

2. **Configuration Components**
   - `src/components/KafkaConfig.tsx`: Kafka connection and consumer configuration
   - `src/components/JmsConfig.tsx`: JMS broker and connection configuration
   - Both support saving to localStorage and connection testing with simulated results

3. **Message Tester** (`src/components/MessageTester.tsx`)
   - Interface for testing message consumers
   - Accepts selected consumer from overview component

### Consumer Data Structure

```typescript
interface Consumer {
  name: string;
  type: 'kafka' | 'jms';
  status: 'active' | 'inactive' | 'error';
  lastTested?: string;
}
```

### Key Features

- **Kafka Consumers**: 18 predefined consumers including flight data, maintenance, fuel management
- **JMS Consumers**: 2 predefined consumers for ACARS and FZFW message queues
- **Configuration Management**: Persistent storage in localStorage for both Kafka and JMS configs
- **Connection Testing**: Simulated connection tests with 70% success rate for demo purposes
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## File Organization

```
src/
├── components/
│   ├── ui/           # shadcn/ui components (extensive collection)
│   ├── ConsumerOverview.tsx
│   ├── KafkaConfig.tsx
│   ├── JmsConfig.tsx
│   └── MessageTester.tsx
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   └── utils.ts      # Tailwind class utilities
├── pages/
│   ├── Index.tsx     # Main application page
│   └── NotFound.tsx
└── App.tsx           # Root component with providers
```

## Development Notes

- TypeScript strict mode is disabled (`noImplicitAny: false`, `strictNullChecks: false`)
- Uses path alias `@/*` for `./src/*` imports
- Vite dev server configured to run on `::` (all interfaces) port 8080
- ESLint configured with React and TypeScript rules
- Component tagging enabled in development mode via `lovable-tagger`

## Configuration Storage

- Kafka configurations saved to `localStorage.kafkaConfig`
- JMS configurations saved to `localStorage.jmsConfig`
- Default configurations provided for both systems

## Testing Strategy

The application currently uses simulated/mock data for:
- Consumer status and metrics
- Connection testing (random success/failure)
- Message testing functionality

Real backend integration would require connecting to actual Kafka clusters and JMS brokers.