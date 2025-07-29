# Valkyrie Training

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/neozeniths-projects-4e562638/v0-valkyrie-training)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/1uyWUO7uL6a)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Diagrams

### PNG

![](./docs/valkyrie_app_architecture.png)

### SVG

![](./docs/valkyrie_app_architecture.svg)

### MermaidJS

```mermaid
---
title: Valkyrie Training Application Architecture
---
flowchart TB
    %% User Flow
    subgraph "👤 User Journey"
        A["fa:fa-user User Starts App"] --> B["fa:fa-cogs Equipment Selection"]
        B --> C["fa:fa-dumbbell Workout Setup"]
        C --> D["fa:fa-timer Workout Timer"]
        D --> E["fa:fa-check-circle Workout Complete"]
    end

    %% Frontend Architecture
    subgraph "⚛️ Frontend Stack"
        F["fa:fa-react React 19.1.0<br/>Next.js 15.2.4"] --> G["fa:fa-palette Tailwind CSS<br/>+ shadcn/ui"]
        F --> H["fa:fa-code TypeScript<br/>Type Safety"]
        G --> I["fa:fa-mobile Responsive Design<br/>Mobile First"]
    end

    %% Component Layer
    subgraph "🧩 UI Components"
        J["fa:fa-layer-group Radix UI Primitives"]
        K["fa:fa-paint-brush Custom Components"]
        L["fa:fa-moon Dark/Light Theme"]
        J --> K
        K --> L
    end

    %% Data Layer
    subgraph "📊 Data Management"
        M["fa:fa-database exercises.json<br/>Exercise Database"]
        N["fa:fa-cog React Hook Form<br/>Form Management"]
        O["fa:fa-shield Zod Validation<br/>Type Safety"]
        M --> N
        N --> O
    end

    %% Deployment & DevOps
    subgraph "🚀 Deployment Pipeline"
        P["fa:fa-code-branch v0.dev<br/>Design System"]
        Q["fa:fa-cloud Vercel<br/>Hosting & CDN"]
        R["fa:fa-sync Auto Sync<br/>v0.dev → GitHub"]
        P --> R
        R --> Q
    end

    %% Testing & Quality
    subgraph "🧪 Testing & Quality"
        S["fa:fa-robot Playwright<br/>E2E Testing"]
        T["fa:fa-check-double ESLint<br/>Code Quality"]
        U["fa:fa-search TypeScript<br/>Static Analysis"]
        S --> T
        T --> U
    end

    %% Application Pages
    subgraph "📱 Application Pages"
        V["fa:fa-home / (Home)<br/>Auto-redirect"]
        W["fa:fa-list /equipment-selection<br/>Choose Equipment"]
        X["fa:fa-cog /workout-setup<br/>Configure Workout"]
        Y["fa:fa-play /workout-timer<br/>Active Workout"]
        Z["fa:fa-trophy /workout-complete<br/>Results & Summary"]
    end

    %% Connections
    A --> V
    V --> W
    W --> X
    X --> Y
    Y --> Z

    F --> V
    F --> W
    F --> X
    F --> Y
    F --> Z

    M --> W
    M --> X
    M --> Y

    P --> F
    Q --> A
    S --> V

    %% Styling with High Contrast Text
    classDef userFlow fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b
    classDef frontend fill:#f3e5f5,stroke:#4a148c,stroke-width:2px,color:#4a148c
    classDef components fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px,color:#1b5e20
    classDef data fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#bf360c
    classDef deployment fill:#fce4ec,stroke:#880e4f,stroke-width:2px,color:#880e4f
    classDef testing fill:#f1f8e9,stroke:#33691e,stroke-width:2px,color:#33691e
    classDef pages fill:#e0f2f1,stroke:#004d40,stroke-width:2px,color:#004d40

    class A,B,C,D,E userFlow
    class F,G,H,I frontend
    class J,K,L components
    class M,N,O data
    class P,Q,R deployment
    class S,T,U testing
    class V,W,X,Y,Z pages

```

## Quickstart

```sh
pnpm dev # Start development server with hot reload
pnpm build # Build for production
pnpm start # Start production server
pnpm lint # Run ESLint
pnpm test # Run Playwright tests
```

## Browser Support

This application supports the following browsers:
- ✅ Chrome/Chromium (Desktop & Mobile)
- ✅ Firefox (Desktop)
- ❌ Safari (Not supported - see [`docs/BROWSER_SUPPORT.md`](docs/BROWSER_SUPPORT.md))

## Deployment

Your project is live at:

**[https://vercel.com/neozeniths-projects-4e562638/v0-valkyrie-training](https://vercel.com/neozeniths-projects-4e562638/v0-valkyrie-training)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/1uyWUO7uL6a](https://v0.dev/chat/projects/1uyWUO7uL6a)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository