/**
 * Exercise Management Utilities
 * Provides utilities for working with exercises, including ID mapping and variant handling
 */

import type { Exercise } from "@/types/exercise"
import exerciseData from "@/data/exercises.json"
import { ExerciseVariant } from "./url-params"

export interface ExerciseWithVariant {
  exercise: Exercise
  selectedVariant: ExerciseVariant
}

export interface ProcessedExercise extends Exercise {
  originalId?: string // Store the original exercise ID for URL purposes
}

/**
 * Get all available exercises
 */
export function getAllExercises(): Exercise[] {
  return exerciseData.exercises as Exercise[]
}

/**
 * Find exercise by ID
 */
export function findExerciseById(id: string): Exercise | null {
  const exercises = getAllExercises()
  return exercises.find(ex => ex.id === id) || null
}

/**
 * Get exercises that match the given equipment
 */
export function getExercisesForEquipment(selectedEquipment: string[]): Exercise[] {
  const exercises = getAllExercises()
  
  // Add barbell to effective equipment if landmine is selected
  const effectiveEquipment = [...selectedEquipment]
  if (selectedEquipment.includes("landmine") && !effectiveEquipment.includes("barbell")) {
    effectiveEquipment.push("barbell")
  }

  return exercises.filter((exercise: Exercise) => {
    const hasAllEquipment = exercise.equipment.every((eq) => effectiveEquipment.includes(eq))
    if (!hasAllEquipment) return false

    // Special handling for barbell exercises that aren't landmine
    if (exercise.equipment.includes("barbell") && !exercise.equipment.includes("landmine")) {
      if (!selectedEquipment.includes("barbell")) return false
    }

    return true
  })
}

/**
 * Convert exercise IDs with variants to exercise objects
 */
export function exerciseIdsToExercises(exerciseIds: Array<{ id: string; variant: ExerciseVariant }>): ExerciseWithVariant[] {
  return exerciseIds
    .map(({ id, variant }) => {
      const exercise = findExerciseById(id)
      if (!exercise) return null
      
      return {
        exercise,
        selectedVariant: variant
      }
    })
    .filter((item): item is ExerciseWithVariant => item !== null)
}

/**
 * Convert exercise objects with variants to exercise IDs for URL
 */
export function exercisesToExerciseIds(exercises: ExerciseWithVariant[]): Array<{ id: string; variant: ExerciseVariant }> {
  return exercises.map(({ exercise, selectedVariant }) => ({
    id: exercise.id,
    variant: selectedVariant
  }))
}

/**
 * Get the display name for an exercise variant
 */
export function getExerciseVariantName(exercise: Exercise, variant: ExerciseVariant): string {
  switch (variant) {
    case "regression":
      return exercise.regression.name
    case "progression":
      return exercise.progression.name
    default:
      return exercise.name
  }
}

/**
 * Convert exercises with variants to final exercise objects for workout
 */
export function processExercisesForWorkout(exercises: ExerciseWithVariant[]): ProcessedExercise[] {
  return exercises.map(({ exercise, selectedVariant }) => {
    if (selectedVariant === "regression") {
      return {
        ...exercise,
        id: `${exercise.id}-regression`,
        name: exercise.regression.name,
        cues: exercise.regression.cues,
        originalId: exercise.id
      }
    } else if (selectedVariant === "progression") {
      return {
        ...exercise,
        id: `${exercise.id}-progression`,
        name: exercise.progression.name,
        cues: exercise.progression.cues,
        originalId: exercise.id
      }
    }
    return {
      ...exercise,
      originalId: exercise.id
    }
  })
}

/**
 * Generate a random selection of exercises from available pool
 */
export function generateRandomExercises(
  availableExercises: Exercise[], 
  count: number
): ExerciseWithVariant[] {
  if (availableExercises.length === 0) return []
  
  const shuffled = [...availableExercises].sort(() => 0.5 - Math.random())
  const selected = shuffled.slice(0, Math.min(count, availableExercises.length))
  
  return selected.map(exercise => ({
    exercise,
    selectedVariant: "standard" as ExerciseVariant
  }))
}

/**
 * Validate that exercise IDs are available for the given equipment
 */
export function validateExerciseIds(
  exerciseIds: Array<{ id: string; variant: ExerciseVariant }>,
  selectedEquipment: string[]
): Array<{ id: string; variant: ExerciseVariant }> {
  const availableExercises = getExercisesForEquipment(selectedEquipment)
  const availableIds = new Set(availableExercises.map(ex => ex.id))
  
  return exerciseIds.filter(({ id }) => availableIds.has(id))
}

/**
 * Get exercise names for display (processed with variants)
 */
export function getExerciseNamesForDisplay(exercises: ExerciseWithVariant[]): string[] {
  return exercises.map(({ exercise, selectedVariant }) => 
    getExerciseVariantName(exercise, selectedVariant)
  )
}

/**
 * Equipment name mapping for consistent display
 */
export const EQUIPMENT_DISPLAY_NAMES: Record<string, string> = {
  "bodyweight": "Bodyweight",
  "dumbbells": "Dumbbells", 
  "resistance-bands": "Resistance Bands",
  "kettlebell": "Kettlebell",
  "barbell": "Barbell",
  "landmine": "Landmine",
  "pull-up-bar": "Pull-up Bar",
  "medicine-ball": "Medicine Ball",
  "stability-ball": "Stability Ball"
}

/**
 * Get display name for equipment
 */
export function getEquipmentDisplayName(equipment: string): string {
  return EQUIPMENT_DISPLAY_NAMES[equipment] || equipment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
}