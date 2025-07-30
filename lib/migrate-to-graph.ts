/**
 * Migration utility to convert existing exercise data to graph format
 */

import { ExerciseGraph, ExerciseEdge, ExerciseSubgraph } from '@/types/exercise-graph'
import { CatalogExercise } from '@/types/exercise-catalog'

interface OldExercise {
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

interface OldRelationship {
  exerciseId: string
  reason: string
  difficulty: number
}

interface OldRelationships {
  relationships: {
    [exerciseId: string]: {
      regressions?: OldRelationship[]
      progressions?: OldRelationship[]
    }
  }
}

/**
 * Determine movement pattern based on target muscles and exercise name
 */
function getMovementPattern(exercise: OldExercise): 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core' | 'hybrid' {
  const name = exercise.name.toLowerCase()
  const muscles = exercise.targetMuscles.join(' ').toLowerCase()
  
  // Push patterns
  if (name.includes('push-up') || name.includes('dip') || name.includes('press') || 
      muscles.includes('chest') || muscles.includes('triceps')) {
    return 'push'
  }
  
  // Pull patterns
  if (name.includes('pull-up') || name.includes('chin-up') || name.includes('row') ||
      muscles.includes('back') || muscles.includes('lats')) {
    return 'pull'
  }
  
  // Squat patterns
  if (name.includes('squat') || name.includes('lunge') || name.includes('pistol')) {
    return 'squat'
  }
  
  // Hinge patterns
  if (name.includes('deadlift') || name.includes('swing') || name.includes('bridge') ||
      muscles.includes('hamstrings') && muscles.includes('glutes')) {
    return 'hinge'
  }
  
  // Core patterns
  if (name.includes('plank') || name.includes('hollow') || name.includes('sit') ||
      muscles.includes('core') || muscles.includes('abs')) {
    return 'core'
  }
  
  // Default to hybrid
  return 'hybrid'
}

/**
 * Create subgraph ID from movement pattern and equipment
 */
function getSubgraphId(pattern: string, equipment: string[]): string {
  if (equipment.includes('barbell')) return `${pattern}-barbell`
  if (equipment.includes('dumbbells')) return `${pattern}-dumbbell`
  if (equipment.includes('kettlebells')) return `${pattern}-kettlebell`
  if (equipment.includes('pull-up-bar')) return `${pattern}-pullup-bar`
  if (equipment.includes('resistance-bands')) return `${pattern}-bands`
  if (equipment.includes('parallettes')) return `${pattern}-parallettes`
  return `${pattern}-bodyweight`
}

/**
 * Estimate difficulty based on exercise characteristics
 */
function estimateDifficulty(exercise: OldExercise): number {
  let difficulty = 5 // baseline
  
  const name = exercise.name.toLowerCase()
  
  // Easier exercises
  if (name.includes('knee') || name.includes('wall') || name.includes('partial') || 
      name.includes('assisted') || name.includes('negative')) {
    difficulty -= 2
  }
  if (name.includes('incline') || name.includes('box')) {
    difficulty -= 1
  }
  
  // Harder exercises
  if (name.includes('decline') || name.includes('deficit') || name.includes('weighted')) {
    difficulty += 1
  }
  if (name.includes('one-arm') || name.includes('one-leg') || name.includes('single')) {
    difficulty += 2
  }
  if (name.includes('muscle-up') || name.includes('planche') || name.includes('lever')) {
    difficulty += 3
  }
  
  return Math.max(0, Math.min(10, difficulty))
}

/**
 * Convert old exercise data to new graph format
 */
export function migrateToGraph(
  oldExercises: OldExercise[],
  oldRelationships: OldRelationships,
  oldCatalog?: { exercises: { [id: string]: CatalogExercise } },
  modifierRules?: any
): ExerciseGraph {
  const exercises: { [id: string]: CatalogExercise } = {}
  const subgraphs: { [id: string]: ExerciseSubgraph } = {}
  const globalEdges: ExerciseEdge[] = []
  const edgeIdCounter = { count: 0 }
  
  // First pass: Convert all exercises and organize into subgraphs
  for (const oldExercise of oldExercises) {
    // Use catalog exercise if available, otherwise convert from old format
    const catalogExercise = oldCatalog?.exercises[oldExercise.id] || {
      name: oldExercise.name,
      equipment: oldExercise.equipment,
      targetMuscles: oldExercise.targetMuscles,
      cues: oldExercise.cues
    }
    
    exercises[oldExercise.id] = catalogExercise
    
    // Determine subgraph
    const pattern = getMovementPattern(oldExercise)
    const subgraphId = getSubgraphId(pattern, oldExercise.equipment)
    
    if (!subgraphs[subgraphId]) {
      subgraphs[subgraphId] = {
        id: subgraphId,
        name: `${pattern.charAt(0).toUpperCase() + pattern.slice(1)} - ${
          oldExercise.equipment.includes('bodyweight') ? 'Bodyweight' : 
          oldExercise.equipment[0].replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
        }`,
        description: `${pattern} movement patterns using ${oldExercise.equipment.join(', ')}`,
        primaryMovementPattern: pattern,
        equipmentRequired: Array.from(new Set(oldExercise.equipment)),
        difficulty: {
          min: 10,
          max: 0
        },
        exercises: [],
        edges: [],
        entryPoints: [],
        landmarks: []
      }
    }
    
    subgraphs[subgraphId].exercises.push(oldExercise.id)
    
    // Update difficulty range
    const exerciseDifficulty = estimateDifficulty(oldExercise)
    subgraphs[subgraphId].difficulty.min = Math.min(subgraphs[subgraphId].difficulty.min, exerciseDifficulty)
    subgraphs[subgraphId].difficulty.max = Math.max(subgraphs[subgraphId].difficulty.max, exerciseDifficulty)
  }
  
  // Second pass: Create edges from relationships
  for (const [exerciseId, relations] of Object.entries(oldRelationships.relationships)) {
    const exercise = oldExercises.find(e => e.id === exerciseId)
    if (!exercise) continue
    
    const pattern = getMovementPattern(exercise)
    const subgraphId = getSubgraphId(pattern, exercise.equipment)
    const subgraph = subgraphs[subgraphId]
    
    // Process regressions (these become outgoing edges from the current exercise to easier exercises)
    if (relations.regressions) {
      for (const regression of relations.regressions) {
        const regressionExercise = oldExercises.find(e => e.id === regression.exerciseId)
        if (!regressionExercise) continue
        
        const regressionPattern = getMovementPattern(regressionExercise)
        const regressionSubgraphId = getSubgraphId(regressionPattern, regressionExercise.equipment)
        
        const edge: ExerciseEdge = {
          id: `edge-${++edgeIdCounter.count}`,
          from: exerciseId,
          to: regression.exerciseId,
          relationship: 'regression',
          difficultyChange: regression.difficulty - 1, // Convert to relative scale (should be negative)
          reason: regression.reason
        }
        
        if (subgraphId === regressionSubgraphId) {
          // Same subgraph
          subgraph.edges.push(edge)
        } else {
          // Cross-subgraph
          globalEdges.push(edge)
        }
      }
    }
    
    // Process progressions (these become outgoing edges from the current exercise)
    if (relations.progressions) {
      for (const progression of relations.progressions) {
        const progressionExercise = oldExercises.find(e => e.id === progression.exerciseId)
        if (!progressionExercise) continue
        
        const progressionPattern = getMovementPattern(progressionExercise)
        const progressionSubgraphId = getSubgraphId(progressionPattern, progressionExercise.equipment)
        
        const edge: ExerciseEdge = {
          id: `edge-${++edgeIdCounter.count}`,
          from: exerciseId,
          to: progression.exerciseId,
          relationship: 'progression',
          difficultyChange: progression.difficulty - 1, // Convert to relative scale
          reason: progression.reason
        }
        
        if (subgraphId === progressionSubgraphId) {
          // Same subgraph
          subgraph.edges.push(edge)
        } else {
          // Cross-subgraph
          globalEdges.push(edge)
        }
      }
    }
  }
  
  // Third pass: Identify entry points and landmarks
  for (const subgraph of Object.values(subgraphs)) {
    // Entry points: exercises with no incoming edges or low difficulty
    for (const exerciseId of subgraph.exercises) {
      const hasIncomingEdges = subgraph.edges.some(e => e.to === exerciseId) ||
                               globalEdges.some(e => e.to === exerciseId)
      const exercise = oldExercises.find(e => e.id === exerciseId)
      if (!exercise) continue
      
      const difficulty = estimateDifficulty(exercise)
      
      if (!hasIncomingEdges || difficulty <= 3) {
        subgraph.entryPoints.push(exerciseId)
      }
      
      // Landmarks: well-known exercises or high difficulty
      if (exercise.name.includes('Push-Up') && !exercise.name.includes('Knee') && !exercise.name.includes('Wall') ||
          exercise.name.includes('Pull-Up') && !exercise.name.includes('Assisted') ||
          exercise.name.includes('Squat') && !exercise.name.includes('Box') ||
          difficulty >= 7) {
        subgraph.landmarks.push(exerciseId)
      }
    }
  }
  
  // Create the final graph
  const graph: ExerciseGraph = {
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalExercises: Object.keys(exercises).length,
      totalEdges: Object.values(subgraphs).reduce((sum, sg) => sum + sg.edges.length, 0) + globalEdges.length,
      subgraphCount: Object.keys(subgraphs).length
    },
    exercises,
    subgraphs,
    connections: [], // Could be populated based on cross-subgraph edges
    globalEdges,
    modifierRules: modifierRules || {
      universal: ['slow-eccentric', 'explosive-concentric', 'bottom-hold', 'top-hold'],
      movementSpecific: {
        push: ['bottom-pulse', 'one-and-half', 'deficit'],
        pull: ['negative-emphasis', 'isometric-holds'],
        squat: ['pause-squat', 'jump-variation', 'single-limb'],
        hinge: ['pause-rep', 'deficit', 'single-limb'],
        core: ['extended-hold', 'dynamic-variation'],
        carry: ['distance-variation', 'tempo-variation']
      },
      equipmentSpecific: {
        bodyweight: ['tempo-variation', 'range-modification'],
        'pull-up-bar': ['grip-variation', 'hanging-variation'],
        dumbbells: ['unilateral-variation', 'tempo-variation'],
        kettlebells: ['flow-variation', 'hold-variation'],
        barbell: ['pause-variation', 'tempo-variation']
      },
      edgeModifiers: {
        progression: ['gradual-loading', 'skill-acquisition'],
        regression: ['assistance', 'range-reduction'],
        variation: ['grip-change', 'stance-change'],
        substitution: ['equipment-swap', 'movement-swap']
      }
    }
  }
  
  return graph
}

/**
 * Load and migrate the full exercise catalog
 * Now only loads the consolidated catalog and relationships files
 */
export async function loadAndMigrateFullCatalog(): Promise<ExerciseGraph> {
  // Import the consolidated data files
  const relationships = await import('@/data/exercise-relationships.json')
  const catalog = await import('@/data/exercises-catalog.json')
  const modifiers = await import('@/data/exercise-modifiers.json')
  
  // Convert catalog exercises to old format for compatibility with migrateToGraph
  const exercisesArray = Object.entries(catalog.exercises).map(([id, exercise]) => ({
    id,
    name: exercise.name,
    equipment: exercise.equipment,
    targetMuscles: exercise.targetMuscles,
    cues: exercise.cues,
    // Add empty regression/progression for compatibility
    regression: { name: "", cues: [] },
    progression: { name: "", cues: [] }
  }))
  
  // Migrate to graph format
  return migrateToGraph(
    exercisesArray,
    relationships,
    catalog,
    modifiers.modifiers
  )
}