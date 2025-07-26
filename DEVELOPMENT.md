# Valkyrie Training - Development Guide

A Node.js/TypeScript developer's guide to working with this Next.js React application.

## 🎯 Quick Orientation

This is a **workout timer application** built with:
- **Next.js 15** - React framework with file-based routing
- **React 19** - UI library with hooks-based state management
- **TypeScript** - Strict type checking enabled
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Pre-built React components

## 🏗️ Architecture Overview

### Application Flow
```
Equipment Selection → Workout Setup → Timer → Completion
     (page.tsx)         (components)
```

The app is a single-page application (SPA) with client-side state management:

1. **Equipment Selection**: User picks available workout equipment
2. **Workout Setup**: Configure exercises, sets, and timing
3. **Timer**: Active workout with countdown timers
4. **Completion**: Summary screen with stats

## 📁 Key Files & Concepts

### Entry Points

#### `app/page.tsx` - Main Application
- **Client Component** (`"use client"` directive)
- Manages global app state using React hooks
- State-based routing (no URL changes)
- Key states: `equipment`, `setup`, `workout`, `complete`

```typescript
// State management pattern
const [appState, setAppState] = useState<AppState>("equipment")
const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
```

#### `app/layout.tsx` - Root Layout
- Server Component (no `"use client"`)
- Wraps all pages with HTML structure
- Sets up fonts and global styles
- Metadata for SEO

### React Concepts for Node.js Developers

#### 1. **Components = Functions**
React components are just functions that return JSX (HTML-like syntax):

```typescript
// Simple component
function Button({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>
}
```

#### 2. **State Management**
Unlike Node.js where state lives in variables/databases, React uses hooks:

```typescript
const [count, setCount] = useState(0)  // count = 0
setCount(count + 1)                    // triggers re-render
```

#### 3. **Props = Function Arguments**
Data flows down through props (like function parameters):

```typescript
// Parent passes data down
<WorkoutTimer exercises={exercises} sets={3} />

// Child receives as props
function WorkoutTimer({ exercises, sets }) {
  // use exercises and sets here
}
```

#### 4. **Effects = Side Effects**
For async operations, timers, or external interactions:

```typescript
useEffect(() => {
  const timer = setInterval(() => {}, 1000)
  return () => clearInterval(timer)  // cleanup
}, [dependency])  // runs when dependency changes
```

## 🛠️ Development Workflow

### Local Development
```bash
pnpm dev      # Start dev server on http://localhost:3000
pnpm build    # Build for production
pnpm lint     # Run ESLint
```

### File Structure
```
v0-valkyrie-training/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page component
│   ├── layout.tsx         # Root layout wrapper
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components (pre-built)
│   └── *.tsx             # Custom components
├── types/                 # TypeScript type definitions
│   └── exercise.ts       # Core data types
├── data/                  # Static data
│   └── exercises.json    # Exercise database
└── lib/                   # Utilities
    └── utils.ts          # Helper functions
```

### Component Pattern
Most components follow this structure:

```typescript
"use client"  // Required for interactive components

import { useState } from "react"
import { ComponentProps } from "@/types/component"

interface Props {
  onAction: (data: any) => void
  initialValue: string
}

export default function MyComponent({ onAction, initialValue }: Props) {
  const [state, setState] = useState(initialValue)
  
  return (
    <div>
      {/* JSX content */}
    </div>
  )
}
```

## 🔧 Common Tasks

### Adding a New Feature

1. **Define Types** in `types/`
```typescript
// types/workout.ts
export interface WorkoutConfig {
  duration: number
  intensity: 'low' | 'medium' | 'high'
}
```

2. **Create Component** in `components/`
```typescript
// components/workout-config.tsx
"use client"
import { WorkoutConfig } from "@/types/workout"

export default function WorkoutConfigPanel({ config }: { config: WorkoutConfig }) {
  return <div>{/* UI */}</div>
}
```

3. **Integrate in Main App** (`app/page.tsx`)
```typescript
import WorkoutConfigPanel from "@/components/workout-config"
// Add to state and render logic
```

### Working with State

The app uses **prop drilling** (passing data through props):

```
page.tsx (state owner)
    ↓ props
WorkoutSetup
    ↓ props  
WorkoutTimer
```

For complex state, consider:
- React Context (built-in)
- Zustand (lightweight state manager)
- Component composition

### Styling with Tailwind

```jsx
// Instead of CSS files:
<div className="flex items-center justify-between p-4 bg-blue-500 hover:bg-blue-600">
  <span className="text-white font-bold">Title</span>
</div>
```

Common patterns:
- `flex` - Flexbox layout
- `grid` - Grid layout
- `p-4` - Padding (1rem)
- `bg-blue-500` - Background color
- `hover:` - Hover states
- `md:` - Responsive breakpoints

## 🚀 Next.js Specifics

### App Router Concepts

1. **File-based Routing**: Files in `app/` become routes
   - `app/page.tsx` → `/`
   - `app/about/page.tsx` → `/about`

2. **Client vs Server Components**:
   - **Server**: Default, runs on server, no interactivity
   - **Client**: Add `"use client"`, runs in browser, interactive

3. **Data Fetching**: 
   - Server Components can fetch data directly
   - Client Components use `useEffect` or React Query

### Import Aliases

The `@/` prefix maps to the project root:
```typescript
import { Button } from "@/components/ui/button"  // ./components/ui/button
import { Exercise } from "@/types/exercise"      // ./types/exercise
```

## 📋 Quick Reference

### Essential Commands
```bash
# Development
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # Run linter

# Add dependencies
pnpm add package-name
pnpm add -D dev-package-name
```

### VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- TypeScript React code snippets

### Debugging Tips
1. Use browser DevTools Console for errors
2. React Developer Tools extension shows component tree
3. `console.log` in components (remove for production)
4. TypeScript errors appear in terminal and IDE

### Common Patterns

**Conditional Rendering**:
```jsx
{isLoading && <Spinner />}
{error ? <Error /> : <Content />}
```

**List Rendering**:
```jsx
{exercises.map((exercise) => (
  <ExerciseCard key={exercise.id} exercise={exercise} />
))}
```

**Event Handling**:
```jsx
<button onClick={() => handleClick(id)}>Click</button>
<input onChange={(e) => setValue(e.target.value)} />
```

## 🔍 Where to Look

- **Routing logic**: `app/page.tsx` (state machine)
- **UI Components**: `components/ui/` (pre-built)
- **Business logic**: Individual component files
- **Types**: `types/` directory
- **Styles**: Tailwind classes in components
- **Config**: `next.config.mjs`, `tailwind.config.ts`

## 💡 Tips for Node.js Developers

1. **Think in Components**: Break UI into reusable pieces
2. **State is Immutable**: Always create new objects/arrays
3. **Props Flow Down**: Data goes parent → child
4. **Events Flow Up**: Callbacks go child → parent
5. **Effects are Escape Hatches**: Use sparingly for side effects

Remember: React is declarative - you describe *what* the UI should look like based on state, not *how* to manipulate it step by step.