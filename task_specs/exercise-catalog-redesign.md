# Exercise Catalog Redesign Specification

## Overview
Redesign the exercise catalog to separate exercise definitions from their progression/regression relationships, creating a more modular and maintainable structure.

## Current Structure Issues
- Exercises have progression/regression data embedded within each exercise object
- This creates duplication when exercises appear as both primary exercises and progressions/regressions
- Makes it difficult to maintain complex progression chains
- Couples exercise data with relationship data

## New Design Goals
1. **Standalone Exercises**: Each exercise should be a complete, self-contained entity
2. **Human-Readable IDs**: Use descriptive, URL-friendly IDs (e.g., "push-ups" instead of numeric IDs)
3. **Separate Relationships**: Create a dedicated catalog for progression/regression relationships
4. **Flexibility**: Allow for multiple progression paths and complex relationship networks
5. **Maintainability**: Easy to add new exercises or modify relationships without affecting core exercise data

## Proposed Structure

### Exercise Catalog (`exercises-catalog.json`)
```json
{
  "exercises": {
    "push-ups": {
      "name": "Push-Ups",
      "equipment": ["bodyweight"],
      "targetMuscles": ["chest", "shoulders", "triceps"],
      "cues": [
        "Hands shoulder-width apart, fingers pointing forward.",
        "Body in a straight line from head to heels.",
        "Lower your chest to the floor, keeping elbows at a 45-degree angle.",
        "Press through your palms to return to the start."
      ]
    },
    "incline-push-ups": {
      "name": "Incline Push-Ups",
      "equipment": ["bodyweight", "bench"],
      "targetMuscles": ["chest", "shoulders", "triceps"],
      "cues": [
        "Place hands on a bench or elevated surface.",
        "The higher the surface, the easier the exercise.",
        "Maintain a straight body line.",
        "Focus on full range of motion."
      ]
    }
  }
}
```

### Exercise Relationships Catalog (`exercise-relationships.json`)
```json
{
  "relationships": {
    "push-ups": {
      "regressions": [
        {
          "exerciseId": "incline-push-ups",
          "reason": "Reduces load by elevating upper body",
          "difficulty": 0.7
        },
        {
          "exerciseId": "knee-push-ups",
          "reason": "Reduces lever length",
          "difficulty": 0.5
        }
      ],
      "progressions": [
        {
          "exerciseId": "decline-push-ups",
          "reason": "Increases load on upper body",
          "difficulty": 1.3
        },
        {
          "exerciseId": "diamond-push-ups",
          "reason": "Increases tricep activation",
          "difficulty": 1.5
        }
      ]
    }
  }
}
```

## Key Design Decisions

### 1. Human-Readable IDs
- Use kebab-case for consistency
- IDs should be descriptive and URL-safe
- Examples: "push-ups", "barbell-back-squat", "single-leg-glute-bridge"

### 2. Relationship Metadata
- Include difficulty multipliers for better progression planning
- Add reasons for progressions/regressions to help users understand
- Allow multiple progression paths (e.g., push-ups can progress to either decline push-ups OR diamond push-ups)

### 3. Equipment Normalization
- Standardize equipment names across all exercises
- Use array to support exercises requiring multiple equipment pieces

### 4. Muscle Group Consistency
- Use consistent muscle group naming
- Support compound exercises targeting multiple muscle groups

## Implementation Steps
1. Extract all unique exercises from current catalog
2. Assign human-readable IDs to each exercise
3. Create standalone exercise entries
4. Map all progression/regression relationships
5. Create relationship catalog with metadata
6. Update TypeScript interfaces
7. Update any code that depends on the old structure

## Benefits
- **Modularity**: Easy to add/remove exercises without affecting relationships
- **Reusability**: Exercises can appear in multiple progression chains
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new relationship types (e.g., "alternatives", "supersets")
- **Data Integrity**: No duplication of exercise data