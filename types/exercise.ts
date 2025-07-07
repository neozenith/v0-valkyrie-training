export interface Exercise {
  id: string
  name: string
  equipment: string[]
  targetMuscles: string[]
  cues: string[]
  regression: {
    name: string
    cues: string[]
  }
  progression: {
    name: string
    cues: string[]
  }
}

export interface WorkoutState {
  selectedEquipment: string[]
  availableExercises: Exercise[]
  workoutExercises: Exercise[]
  sets: number
  currentExercise: number
  currentSet: number
  isWorkoutActive: boolean
  workTime: number
  restTime: number
  totalWorkoutTime: number
  isResting: boolean
}
