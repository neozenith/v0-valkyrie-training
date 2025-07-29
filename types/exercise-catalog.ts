// Standalone exercise definition
export interface CatalogExercise {
  name: string
  equipment: string[]
  targetMuscles: string[]
  cues: string[]
}

// Exercise catalog structure
export interface ExerciseCatalog {
  exercises: {
    [exerciseId: string]: CatalogExercise
  }
}

// Relationship between exercises
export interface ExerciseRelation {
  exerciseId: string
  reason: string
  difficulty: number // Difficulty multiplier (e.g., 0.7 for easier, 1.3 for harder)
}

// Exercise relationships structure
export interface ExerciseRelationships {
  relationships: {
    [exerciseId: string]: {
      regressions?: ExerciseRelation[]
      progressions?: ExerciseRelation[]
    }
  }
}

// Combined exercise data with relationships (for runtime use)
export interface ExerciseWithRelationships extends CatalogExercise {
  id: string
  regressions?: ExerciseRelation[]
  progressions?: ExerciseRelation[]
}

// Workout state remains the same but uses the new structure
export interface WorkoutState {
  selectedEquipment: string[]
  availableExercises: ExerciseWithRelationships[]
  workoutExercises: ExerciseWithRelationships[]
  sets: number
  currentExercise: number
  currentSet: number
  isWorkoutActive: boolean
  workTime: number
  restTime: number
  totalWorkoutTime: number
  isResting: boolean
}