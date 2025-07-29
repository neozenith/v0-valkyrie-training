/**
 * Graph-based Exercise System Types
 * Unified data structure for exercise relationships and progressions
 */

import { CatalogExercise } from './exercise-catalog'

/**
 * Represents a directed relationship between two exercises
 * Stores the relationship once and can be traversed in both directions
 */
export interface ExerciseEdge {
  id: string
  from: string // exercise ID
  to: string   // exercise ID
  relationship: 'progression' | 'variation' | 'substitution' | 'prerequisite'
  difficultyChange: number // positive = harder, negative = easier (-1.0 to +1.0)
  reason: string
  requirements?: string[] // optional prerequisites to unlock this edge
  modifiers?: string[] // applicable modifiers that work well with this transition
  equipment?: string[] // additional equipment needed for this transition
}

/**
 * A thematic grouping of related exercises with their internal relationships
 */
export interface ExerciseSubgraph {
  id: string
  name: string
  description: string
  primaryMovementPattern: 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'core' | 'hybrid'
  equipmentRequired: string[]
  difficulty: {
    min: number // minimum difficulty in this subgraph (0-10)
    max: number // maximum difficulty in this subgraph (0-10)
  }
  exercises: string[] // exercise IDs in this subgraph
  edges: ExerciseEdge[] // relationships within this subgraph
  entryPoints: string[] // recommended starting exercises for beginners
  landmarks: string[] // key milestone exercises in progression
}

/**
 * Cross-subgraph connection representing exercise relationships
 * that span different movement families or equipment types
 */
export interface SubgraphConnection {
  fromSubgraph: string
  toSubgraph: string
  edges: ExerciseEdge[]
  connectionType: 'equipment-upgrade' | 'movement-transfer' | 'hybrid-skill'
}

/**
 * Complete exercise graph containing all exercises and relationships
 */
export interface ExerciseGraph {
  metadata: {
    version: string
    lastUpdated: string
    totalExercises: number
    totalEdges: number
    subgraphCount: number
  }
  
  exercises: {
    [exerciseId: string]: CatalogExercise
  }
  
  subgraphs: {
    [subgraphId: string]: ExerciseSubgraph
  }
  
  connections: SubgraphConnection[]
  
  globalEdges: ExerciseEdge[] // direct cross-subgraph relationships
  
  modifierRules: ModifierApplicationRules
}

/**
 * Rules for applying modifiers to exercises and edges
 */
export interface ModifierApplicationRules {
  universal: string[] // modifiers that can apply to any exercise
  movementSpecific: {
    [movementPattern: string]: string[]
  }
  equipmentSpecific: {
    [equipment: string]: string[]
  }
  edgeModifiers: {
    [relationshipType: string]: string[] // modifiers that apply to transitions
  }
}

/**
 * Data structure for Cytoscape visualization
 */
export interface CytoscapeNode {
  data: {
    id: string
    label: string
    difficulty: number
    equipment: string[]
    subgraph: string
    movementPattern: string
    isEntryPoint?: boolean
    isLandmark?: boolean
  }
  position?: { x: number; y: number }
  classes?: string[]
}

export interface CytoscapeEdge {
  data: {
    id: string
    source: string
    target: string
    relationship: string
    difficultyChange: number
    reason: string
    bidirectional: boolean
  }
  classes?: string[]
}

export interface CytoscapeData {
  nodes: CytoscapeNode[]
  edges: CytoscapeEdge[]
}

/**
 * Visualization configuration options
 */
export interface GraphVisualizationConfig {
  layout: 'hierarchical' | 'circular' | 'force-directed' | 'grid'
  showDifficulty: boolean
  showEquipment: boolean
  showModifiers: boolean
  maxDepth: number
  focusExercise?: string
  highlightPath?: string[]
  colorScheme: 'difficulty' | 'equipment' | 'movement' | 'subgraph'
}

/**
 * Exercise progression path with difficulty scoring
 */
export interface ProgressionPath {
  exercises: string[]
  totalDifficultyChange: number
  requiredEquipment: string[]
  estimatedWeeks: number
  milestones: string[]
}

/**
 * Workout generation preferences
 */
export interface WorkoutGenerationPrefs {
  equipment: string[]
  difficultyRange: { min: number; max: number }
  movementPatterns: string[]
  progression: boolean // whether to include progressive overload
  balanceRequirement: boolean // balance push/pull, etc.
  excludeExercises?: string[]
}