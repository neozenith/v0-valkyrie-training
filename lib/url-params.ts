/**
 * URL Parameter Management Utilities
 * Provides type-safe parsing and serialization of URL parameters for all app pages
 */

export type WorkoutStyle = "hiit" | "tabata"
export type ExerciseVariant = "standard" | "regression" | "progression"

// URL Parameter Interfaces
export interface EquipmentSelectionParams {
  equipment?: string[] // Array of equipment names
}

export interface WorkoutSetupParams {
  equipment?: string[] // Inherited from equipment selection
  sets?: number
  exercises?: number // Number of exercises to include
  style?: WorkoutStyle
  workTime?: number // Work time in seconds
  restTime?: number // Rest time in seconds
  setRestTime?: number // Set rest time in seconds
  exerciseIds?: Array<{ id: string; variant: ExerciseVariant }> // Array of exercise objects with variant
}

export interface WorkoutTimerParams {
  sets?: number
  exercises?: number
  style?: WorkoutStyle
  workTime?: number
  restTime?: number
  setRestTime?: number
  exerciseIds?: Array<{ id: string; variant: ExerciseVariant }> // Array of exercise objects with variant
}

export interface WorkoutCompleteParams {
  exercises?: string[] // Exercise names for display
  sets?: number
  totalTime?: number // Total time in seconds
}

// Default values
export const DEFAULT_VALUES = {
  sets: 2,
  exercises: 5,
  style: "hiit" as WorkoutStyle,
  workTime: 40,
  restTime: 20,
  setRestTime: 60,
  equipment: ["bodyweight"] as string[],
}

/**
 * Parse equipment from URL parameter
 */
export function parseEquipment(param: string | null): string[] {
  if (!param) return DEFAULT_VALUES.equipment
  return param.split(',').filter(Boolean)
}

/**
 * Serialize equipment to URL parameter
 */
export function serializeEquipment(equipment: string[]): string {
  return equipment.join(',')
}

/**
 * Parse exercise IDs with variants from URL parameter
 * Format: "exerciseId:variant,exerciseId2:variant2"
 */
export function parseExerciseIds(param: string | null): Array<{ id: string; variant: ExerciseVariant }> {
  if (!param) return []
  
  return param.split(',').filter(Boolean).map(item => {
    const [id, variant = 'standard'] = item.split(':')
    return {
      id: id.trim(),
      variant: (variant as ExerciseVariant) || 'standard'
    }
  })
}

/**
 * Serialize exercise IDs with variants to URL parameter
 */
export function serializeExerciseIds(exercises: Array<{ id: string; variant: ExerciseVariant }>): string {
  return exercises.map(ex => `${ex.id}:${ex.variant}`).join(',')
}

/**
 * Parse exercise names from URL parameter (for display)
 */
export function parseExerciseNames(param: string | null): string[] {
  if (!param) return []
  return param.split(',').filter(Boolean).map(name => decodeURIComponent(name))
}

/**
 * Serialize exercise names to URL parameter
 */
export function serializeExerciseNames(names: string[]): string {
  return names.join(',')
}

/**
 * Parse a number parameter with default fallback
 */
export function parseNumber(param: string | null, defaultValue: number): number {
  if (!param) return defaultValue
  const parsed = parseInt(param, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Parse workout style parameter
 */
export function parseWorkoutStyle(param: string | null): WorkoutStyle {
  if (param === 'hiit' || param === 'tabata') return param
  return DEFAULT_VALUES.style
}

/**
 * Parse equipment selection URL parameters
 */
export function parseEquipmentSelectionParams(searchParams: URLSearchParams): EquipmentSelectionParams {
  return {
    equipment: parseEquipment(searchParams.get('equipment'))
  }
}

/**
 * Parse workout setup URL parameters
 */
export function parseWorkoutSetupParams(searchParams: URLSearchParams): WorkoutSetupParams {
  return {
    equipment: parseEquipment(searchParams.get('equipment')),
    sets: parseNumber(searchParams.get('sets'), DEFAULT_VALUES.sets),
    exercises: parseNumber(searchParams.get('exercises'), DEFAULT_VALUES.exercises),
    style: parseWorkoutStyle(searchParams.get('style')),
    workTime: parseNumber(searchParams.get('workTime'), DEFAULT_VALUES.workTime),
    restTime: parseNumber(searchParams.get('restTime'), DEFAULT_VALUES.restTime),
    setRestTime: parseNumber(searchParams.get('setRestTime'), DEFAULT_VALUES.setRestTime),
    exerciseIds: parseExerciseIds(searchParams.get('exerciseIds'))
  }
}

/**
 * Parse workout timer URL parameters
 */
export function parseWorkoutTimerParams(searchParams: URLSearchParams): WorkoutTimerParams {
  return {
    sets: parseNumber(searchParams.get('sets'), DEFAULT_VALUES.sets),
    exercises: parseNumber(searchParams.get('exercises'), DEFAULT_VALUES.exercises),
    style: parseWorkoutStyle(searchParams.get('style')),
    workTime: parseNumber(searchParams.get('workTime'), DEFAULT_VALUES.workTime),
    restTime: parseNumber(searchParams.get('restTime'), DEFAULT_VALUES.restTime),
    setRestTime: parseNumber(searchParams.get('setRestTime'), DEFAULT_VALUES.setRestTime),
    exerciseIds: parseExerciseIds(searchParams.get('exerciseIds'))
  }
}

/**
 * Parse workout complete URL parameters
 */
export function parseWorkoutCompleteParams(searchParams: URLSearchParams): WorkoutCompleteParams {
  return {
    exercises: parseExerciseNames(searchParams.get('exercises')),
    sets: parseNumber(searchParams.get('sets'), DEFAULT_VALUES.sets),
    totalTime: parseNumber(searchParams.get('totalTime'), 0)
  }
}

/**
 * Build URL with parameters
 */
export function buildUrl(path: string, params: Record<string, string | number | string[] | undefined>): string {
  const url = new URL(path, window.location.origin)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          url.searchParams.set(key, value.join(','))
        }
      } else {
        url.searchParams.set(key, String(value))
      }
    }
  })
  
  return url.pathname + url.search
}

/**
 * Build equipment selection URL
 */
export function buildEquipmentSelectionUrl(params: Partial<EquipmentSelectionParams>): string {
  return buildUrl('/equipment-selection', {
    equipment: params.equipment
  })
}

/**
 * Build workout setup URL
 */
export function buildWorkoutSetupUrl(params: Partial<WorkoutSetupParams>): string {
  return buildUrl('/workout-setup', {
    equipment: params.equipment,
    sets: params.sets,
    exercises: params.exercises,
    style: params.style,
    workTime: params.workTime,
    restTime: params.restTime,
    setRestTime: params.setRestTime,
    exerciseIds: params.exerciseIds ? serializeExerciseIds(params.exerciseIds) : undefined
  })
}

/**
 * Build workout timer URL
 */
export function buildWorkoutTimerUrl(params: Partial<WorkoutTimerParams>): string {
  return buildUrl('/workout-timer', {
    sets: params.sets,
    exercises: params.exercises,
    style: params.style,
    workTime: params.workTime,
    restTime: params.restTime,
    setRestTime: params.setRestTime,
    exerciseIds: params.exerciseIds ? serializeExerciseIds(params.exerciseIds) : undefined
  })
}

/**
 * Build workout complete URL
 */
export function buildWorkoutCompleteUrl(params: Partial<WorkoutCompleteParams>): string {
  return buildUrl('/workout-complete', {
    exercises: params.exercises ? serializeExerciseNames(params.exercises) : undefined,
    sets: params.sets,
    totalTime: params.totalTime
  })
}