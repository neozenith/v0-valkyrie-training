/**
 * Exercise Graph Utilities
 * Core API for working with the graph-based exercise system
 */

import { 
  ExerciseGraph, 
  ExerciseEdge, 
  ExerciseSubgraph, 
  CytoscapeData, 
  CytoscapeNode, 
  CytoscapeEdge,
  ProgressionPath,
  WorkoutGenerationPrefs,
  GraphVisualizationConfig
} from '@/types/exercise-graph'
import { CatalogExercise } from '@/types/exercise-catalog'

export class ExerciseGraphManager {
  constructor(private graph: ExerciseGraph) {}

  // Core Exercise Access
  getExercise(id: string): CatalogExercise | null {
    return this.graph.exercises[id] || null
  }

  getAllExercises(): CatalogExercise[] {
    return Object.values(this.graph.exercises)
  }

  getExercisesInSubgraph(subgraphId: string): CatalogExercise[] {
    const subgraph = this.graph.subgraphs[subgraphId]
    if (!subgraph) return []
    
    return subgraph.exercises
      .map(id => this.getExercise(id))
      .filter((ex): ex is CatalogExercise => ex !== null)
  }

  // Graph Navigation
  getOutgoingEdges(exerciseId: string): ExerciseEdge[] {
    const edges: ExerciseEdge[] = []
    
    // Check subgraph edges
    for (const subgraph of Object.values(this.graph.subgraphs)) {
      edges.push(...subgraph.edges.filter(edge => edge.from === exerciseId))
    }
    
    // Check global edges
    edges.push(...this.graph.globalEdges.filter(edge => edge.from === exerciseId))
    
    return edges
  }

  getIncomingEdges(exerciseId: string): ExerciseEdge[] {
    const edges: ExerciseEdge[] = []
    
    // Check subgraph edges
    for (const subgraph of Object.values(this.graph.subgraphs)) {
      edges.push(...subgraph.edges.filter(edge => edge.to === exerciseId))
    }
    
    // Check global edges
    edges.push(...this.graph.globalEdges.filter(edge => edge.to === exerciseId))
    
    return edges
  }

  getProgressions(exerciseId: string): ExerciseEdge[] {
    return this.getOutgoingEdges(exerciseId)
      .filter(edge => edge.difficultyChange > 0)
      .sort((a, b) => a.difficultyChange - b.difficultyChange)
  }

  getRegressions(exerciseId: string): ExerciseEdge[] {
    return this.getOutgoingEdges(exerciseId)
      .filter(edge => edge.difficultyChange < 0 || edge.relationship === 'regression') // outgoing edges to easier exercises
      .sort((a, b) => a.difficultyChange - b.difficultyChange) // most negative (easiest) first
  }

  // Difficulty & Progression Analysis
  calculateDifficultyScore(exerciseId: string, baselineId?: string): number {
    if (!baselineId) {
      // Use exercise's subgraph entry points as baseline
      const subgraph = this.findExerciseSubgraph(exerciseId)
      if (!subgraph?.entryPoints.length) return 5 // default medium difficulty
      
      baselineId = subgraph.entryPoints[0]
    }

    if (exerciseId === baselineId) return 0

    const path = this.findShortestPath(baselineId, exerciseId)
    if (!path.length) return 0

    return path.reduce((total, edge) => total + edge.difficultyChange, 0)
  }

  findProgressionPath(fromId: string, toId: string, maxSteps: number = 10): ProgressionPath | null {
    const path = this.findShortestPath(fromId, toId, maxSteps)
    if (!path.length) return null

    const exercises = [fromId, ...path.map(edge => edge.to)]
    const totalDifficultyChange = path.reduce((sum, edge) => sum + edge.difficultyChange, 0)
    
    // Estimate weeks based on difficulty change (roughly 2-4 weeks per difficulty unit)
    const estimatedWeeks = Math.max(2, Math.round(totalDifficultyChange * 3))
    
    // Find landmark exercises in the path
    const milestones = exercises.filter(exerciseId => {
      const subgraph = this.findExerciseSubgraph(exerciseId)
      return subgraph?.landmarks.includes(exerciseId)
    })

    // Collect required equipment
    const requiredEquipment = Array.from(new Set(
      path.flatMap(edge => edge.equipment || [])
        .concat(exercises.flatMap(id => this.getExercise(id)?.equipment || []))
    ))

    return {
      exercises,
      totalDifficultyChange,
      requiredEquipment,
      estimatedWeeks,
      milestones
    }
  }

  suggestNextProgression(exerciseId: string, currentSkillLevel: number): string[] {
    const progressions = this.getProgressions(exerciseId)
    
    // Filter progressions appropriate for current skill level
    return progressions
      .filter(edge => {
        const targetDifficulty = currentSkillLevel + edge.difficultyChange
        return targetDifficulty >= 0 && targetDifficulty <= 10 // reasonable range
      })
      .sort((a, b) => a.difficultyChange - b.difficultyChange) // easier progressions first
      .slice(0, 3) // top 3 suggestions
      .map(edge => edge.to)
  }

  // Path Finding (Dijkstra-style for shortest difficulty path)
  private findShortestPath(fromId: string, toId: string, maxSteps: number = 10): ExerciseEdge[] {
    if (fromId === toId) return []

    const visited = new Set<string>()
    const distances = new Map<string, number>()
    const previous = new Map<string, { exerciseId: string; edge: ExerciseEdge } | null>()
    const queue: { exerciseId: string; distance: number }[] = []

    distances.set(fromId, 0)
    previous.set(fromId, null)
    queue.push({ exerciseId: fromId, distance: 0 })

    while (queue.length > 0) {
      // Get node with minimum distance
      queue.sort((a, b) => a.distance - b.distance)
      const current = queue.shift()!
      
      if (visited.has(current.exerciseId)) continue
      visited.add(current.exerciseId)

      if (current.exerciseId === toId) break
      if (current.distance >= maxSteps) continue

      // Check all outgoing edges
      const edges = this.getOutgoingEdges(current.exerciseId)
      
      for (const edge of edges) {
        if (visited.has(edge.to)) continue

        const newDistance = current.distance + Math.abs(edge.difficultyChange)
        
        if (!distances.has(edge.to) || newDistance < distances.get(edge.to)!) {
          distances.set(edge.to, newDistance)
          previous.set(edge.to, { exerciseId: current.exerciseId, edge })
          queue.push({ exerciseId: edge.to, distance: newDistance })
        }
      }
    }

    // Reconstruct path
    const path: ExerciseEdge[] = []
    let currentId = toId

    while (previous.has(currentId) && previous.get(currentId)) {
      const prev = previous.get(currentId)!
      path.unshift(prev.edge)
      currentId = prev.exerciseId
    }

    return currentId === fromId ? path : [] // return empty if no path found
  }

  // Subgraph Operations
  getSubgraph(subgraphId: string): ExerciseSubgraph | null {
    return this.graph.subgraphs[subgraphId] || null
  }

  findExerciseSubgraph(exerciseId: string): ExerciseSubgraph | null {
    for (const subgraph of Object.values(this.graph.subgraphs)) {
      if (subgraph.exercises.includes(exerciseId)) {
        return subgraph
      }
    }
    return null
  }

  getSubgraphsByMovementPattern(pattern: string): ExerciseSubgraph[] {
    return Object.values(this.graph.subgraphs)
      .filter(subgraph => subgraph.primaryMovementPattern === pattern)
  }

  getSubgraphsByEquipment(equipment: string[]): ExerciseSubgraph[] {
    return Object.values(this.graph.subgraphs)
      .filter(subgraph => 
        equipment.some(eq => subgraph.equipmentRequired.includes(eq))
      )
  }


  // Path analysis for progression depth calculation
  private calculatePathDepthForExercise(exerciseId: string, allExerciseIds: string[]): number {
    const visited = new Set<string>()
    
    const findMaxDepthFrom = (currentId: string, depth: number): number => {
      if (visited.has(currentId)) return depth
      visited.add(currentId)
      
      const outgoing = this.getOutgoingEdges(currentId)
      let maxFromHere = depth
      
      for (const edge of outgoing) {
        if (allExerciseIds.includes(edge.to)) {
          maxFromHere = Math.max(maxFromHere, findMaxDepthFrom(edge.to, depth + 1))
        }
      }
      
      visited.delete(currentId)
      return maxFromHere
    }
    
    return findMaxDepthFrom(exerciseId, 0)
  }

  // Cytoscape Visualization
  generateCytoscapeData(config: GraphVisualizationConfig): CytoscapeData {
    const nodes: CytoscapeNode[] = []
    const edges: CytoscapeEdge[] = []

    let exercisesToInclude: string[] = []
    
    if (config.focusExercise) {
      // Get exercises within maxDepth of focus exercise
      exercisesToInclude = this.getExercisesWithinDepth(config.focusExercise, config.maxDepth)
    } else {
      // Include all exercises
      exercisesToInclude = Object.keys(this.graph.exercises)
    }

    // Create equipment groups as compound nodes if groupByEquipment is enabled
    const equipmentGroups = new Map<string, string[]>()
    
    if (config.groupByEquipment) {
      // Group exercises by their primary equipment
      for (const exerciseId of exercisesToInclude) {
        const exercise = this.getExercise(exerciseId)
        if (!exercise) continue

        const primaryEquipment = this.getPrimaryEquipment(exercise.equipment)
        if (!equipmentGroups.has(primaryEquipment)) {
          equipmentGroups.set(primaryEquipment, [])
        }
        equipmentGroups.get(primaryEquipment)!.push(exerciseId)
      }

      // Create compound nodes for each equipment group
      for (const [equipment, exerciseIds] of equipmentGroups) {
        if (exerciseIds.length > 1) { // Only create compound for multiple exercises
          nodes.push({
            data: {
              id: `equipment-${equipment}`,
              label: this.formatEquipmentName(equipment),
              type: 'equipment-group'
            },
            classes: ['equipment-group']
          })
        }
      }
    }

    // Calculate path depths for all exercises
    const pathDepths = new Map<string, number>()
    let maxPathDepth = 0
    
    for (const exerciseId of exercisesToInclude) {
      const pathDepth = this.calculatePathDepthForExercise(exerciseId, exercisesToInclude)
      pathDepths.set(exerciseId, pathDepth)
      maxPathDepth = Math.max(maxPathDepth, pathDepth)
    }

    // Generate exercise nodes
    for (const exerciseId of exercisesToInclude) {
      const exercise = this.getExercise(exerciseId)
      if (!exercise) continue

      const subgraph = this.findExerciseSubgraph(exerciseId)
      const difficulty = this.calculateDifficultyScore(exerciseId)
      const primaryEquipment = this.getPrimaryEquipment(exercise.equipment)
      const pathDepth = pathDepths.get(exerciseId) || 0
      
      // Determine parent node for compound grouping
      let parent: string | undefined
      if (config.groupByEquipment && equipmentGroups.get(primaryEquipment)!.length > 1) {
        parent = `equipment-${primaryEquipment}`
      }

      nodes.push({
        data: {
          id: exerciseId,
          label: exercise.name,
          difficulty,
          equipment: exercise.equipment,
          subgraph: subgraph?.id || 'unknown',
          movementPattern: subgraph?.primaryMovementPattern || 'unknown',
          isEntryPoint: subgraph?.entryPoints.includes(exerciseId),
          isLandmark: subgraph?.landmarks.includes(exerciseId),
          parent: parent,
          pathDepth: pathDepth,
          maxPathDepth: maxPathDepth
        },
        classes: this.generateNodeClasses(exercise, subgraph, config, exerciseId)
      })
    }

    // Generate edges
    for (const exerciseId of exercisesToInclude) {
      const outgoingEdges = this.getOutgoingEdges(exerciseId)
      
      for (const edge of outgoingEdges) {
        if (!exercisesToInclude.includes(edge.to)) continue

        edges.push({
          data: {
            id: edge.id,
            source: edge.from,
            target: edge.to,
            relationship: edge.relationship,
            difficultyChange: edge.difficultyChange,
            reason: edge.reason,
            bidirectional: this.isBidirectionalEdge(edge)
          },
          classes: this.generateEdgeClasses(edge, config)
        })
      }
    }

    return { nodes, edges }
  }

  private getExercisesWithinDepth(centerExercise: string, maxDepth: number): string[] {
    const visited = new Set<string>()
    const queue: { exerciseId: string; depth: number }[] = [{ exerciseId: centerExercise, depth: 0 }]
    
    while (queue.length > 0) {
      const { exerciseId, depth } = queue.shift()!
      
      if (visited.has(exerciseId) || depth > maxDepth) continue
      visited.add(exerciseId)
      
      if (depth < maxDepth) {
        // Add connected exercises
        const outgoing = this.getOutgoingEdges(exerciseId)
        const incoming = this.getIncomingEdges(exerciseId)
        
        for (const edge of [...outgoing, ...incoming]) {
          const nextExercise = edge.from === exerciseId ? edge.to : edge.from
          queue.push({ exerciseId: nextExercise, depth: depth + 1 })
        }
      }
    }
    
    return Array.from(visited)
  }

  private generateNodeClasses(exercise: CatalogExercise, subgraph: ExerciseSubgraph | null, config: GraphVisualizationConfig, exerciseId: string): string[] {
    const classes: string[] = []
    
    if (config.colorScheme === 'difficulty') {
      const difficulty = this.calculateDifficultyScore(exerciseId)
      classes.push(`difficulty-${Math.floor(difficulty / 2)}`) // 0-5 scale
    } else if (config.colorScheme === 'equipment') {
      const primaryEquipment = this.getPrimaryEquipment(exercise.equipment)
      classes.push(`equipment-${primaryEquipment}`)
    } else if (config.colorScheme === 'movement') {
      classes.push(`movement-${subgraph?.primaryMovementPattern}`)
    } else if (config.colorScheme === 'subgraph') {
      classes.push(`subgraph-${subgraph?.id}`)
    }
    
    if (subgraph?.entryPoints.includes(exerciseId)) classes.push('entry-point')
    if (subgraph?.landmarks.includes(exerciseId)) classes.push('landmark')
    
    return classes
  }

  private generateEdgeClasses(edge: ExerciseEdge, config: GraphVisualizationConfig): string[] {
    const classes: string[] = []
    
    // Use the explicit relationship if available, otherwise infer from difficulty change
    if (edge.relationship === 'progression' || (edge.relationship !== 'regression' && edge.difficultyChange > 0)) {
      classes.push('progression')
    } else if (edge.relationship === 'regression' || edge.difficultyChange < 0) {
      classes.push('regression')
    } else {
      classes.push('lateral')
    }
    
    const magnitude = Math.abs(edge.difficultyChange)
    if (magnitude < 0.3) classes.push('small-change')
    else if (magnitude < 0.7) classes.push('medium-change')
    else classes.push('large-change')
    
    return classes
  }

  private isBidirectionalEdge(edge: ExerciseEdge): boolean {
    // Check if there's a reverse edge
    const reverseEdges = this.getOutgoingEdges(edge.to)
    return reverseEdges.some(reverseEdge => 
      reverseEdge.to === edge.from && 
      Math.abs(reverseEdge.difficultyChange + edge.difficultyChange) < 0.1
    )
  }

  // Workout Generation
  generateProgressiveWorkout(prefs: WorkoutGenerationPrefs): CatalogExercise[] {
    const availableExercises = this.getExercisesForEquipment(prefs.equipment)
    const balancedExercises: CatalogExercise[] = []
    
    if (prefs.balanceRequirement) {
      // Ensure we have balanced movement patterns
      const targetPatterns = prefs.movementPatterns.length > 0 
        ? prefs.movementPatterns 
        : ['push', 'pull', 'squat', 'hinge']
      
      for (const pattern of targetPatterns) {
        const patternExercises = availableExercises.filter(ex => {
          const subgraph = this.findExerciseSubgraph(ex.name)
          return subgraph?.primaryMovementPattern === pattern
        })
        
        if (patternExercises.length > 0) {
          // Pick exercise in difficulty range
          const suitableExercises = patternExercises.filter(ex => {
            const difficulty = this.calculateDifficultyScore(ex.name)
            return difficulty >= prefs.difficultyRange.min && difficulty <= prefs.difficultyRange.max
          })
          
          if (suitableExercises.length > 0) {
            const randomExercise = suitableExercises[Math.floor(Math.random() * suitableExercises.length)]
            balancedExercises.push(randomExercise)
          }
        }
      }
    } else {
      // Simple random selection within difficulty range
      const suitableExercises = availableExercises.filter(ex => {
        const difficulty = this.calculateDifficultyScore(ex.name)
        return difficulty >= prefs.difficultyRange.min && 
               difficulty <= prefs.difficultyRange.max &&
               !prefs.excludeExercises?.includes(ex.name)
      })
      
      // Shuffle and take desired number
      const shuffled = suitableExercises.sort(() => 0.5 - Math.random())
      balancedExercises.push(...shuffled.slice(0, 6)) // Default to 6 exercises
    }
    
    return balancedExercises
  }

  private getExercisesForEquipment(equipment: string[]): CatalogExercise[] {
    return this.getAllExercises().filter(exercise => 
      exercise.equipment.every(eq => equipment.includes(eq))
    )
  }


  // Equipment grouping helpers
  private getPrimaryEquipment(equipment: string[]): string {
    // Priority order for primary equipment classification
    const priorityOrder = [
      'barbell',
      'dumbbells', 
      'kettlebells',
      'pull-up-bar',
      'rings',
      'parallettes',
      'resistance-bands',
      'landmine',
      'bench',
      'bodyweight'
    ]
    
    for (const priority of priorityOrder) {
      if (equipment.includes(priority)) {
        return priority
      }
    }
    
    return equipment[0] || 'bodyweight'
  }

  private formatEquipmentName(equipment: string): string {
    const nameMap: { [key: string]: string } = {
      'bodyweight': 'Bodyweight',
      'dumbbells': 'Dumbbells',
      'barbell': 'Barbell',
      'kettlebells': 'Kettlebells',
      'pull-up-bar': 'Pull-up Bar',
      'rings': 'Rings',
      'parallettes': 'Parallettes',
      'resistance-bands': 'Resistance Bands',
      'landmine': 'Landmine',
      'bench': 'Bench'
    }
    
    return nameMap[equipment] || equipment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  findSubstitutions(exerciseId: string, availableEquipment: string[]): CatalogExercise[] {
    const substitutions: CatalogExercise[] = []
    const originalExercise = this.getExercise(exerciseId)
    if (!originalExercise) return substitutions

    // Find exercises connected by substitution edges
    const edges = [...this.getOutgoingEdges(exerciseId), ...this.getIncomingEdges(exerciseId)]
    
    for (const edge of edges) {
      if (edge.relationship === 'substitution') {
        const substituteId = edge.from === exerciseId ? edge.to : edge.from
        const substitute = this.getExercise(substituteId)
        
        if (substitute && substitute.equipment.every(eq => availableEquipment.includes(eq))) {
          substitutions.push(substitute)
        }
      }
    }

    // Also look for exercises in the same subgraph with similar difficulty
    const subgraph = this.findExerciseSubgraph(exerciseId)
    if (subgraph) {
      const originalDifficulty = this.calculateDifficultyScore(exerciseId)
      
      for (const siblingId of subgraph.exercises) {
        if (siblingId === exerciseId) continue
        
        const sibling = this.getExercise(siblingId)
        if (!sibling || !sibling.equipment.every(eq => availableEquipment.includes(eq))) continue
        
        const siblingDifficulty = this.calculateDifficultyScore(siblingId)
        if (Math.abs(siblingDifficulty - originalDifficulty) <= 1.0) { // Within 1 difficulty unit
          substitutions.push(sibling)
        }
      }
    }

    return substitutions
  }
}

// Factory function to create manager from JSON data
export function createExerciseGraphManager(graphData: ExerciseGraph): ExerciseGraphManager {
  return new ExerciseGraphManager(graphData)
}

// Helper function to validate graph data structure
export function validateExerciseGraph(graph: ExerciseGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check that all edge references point to existing exercises
  for (const subgraph of Object.values(graph.subgraphs)) {
    for (const edge of subgraph.edges) {
      if (!graph.exercises[edge.from]) {
        errors.push(`Edge ${edge.id} references non-existent exercise: ${edge.from}`)
      }
      if (!graph.exercises[edge.to]) {
        errors.push(`Edge ${edge.id} references non-existent exercise: ${edge.to}`)
      }
    }
    
    // Check that all exercises in subgraph exist
    for (const exerciseId of subgraph.exercises) {
      if (!graph.exercises[exerciseId]) {
        errors.push(`Subgraph ${subgraph.id} references non-existent exercise: ${exerciseId}`)
      }
    }
  }
  
  // Check global edges
  for (const edge of graph.globalEdges) {
    if (!graph.exercises[edge.from]) {
      errors.push(`Global edge ${edge.id} references non-existent exercise: ${edge.from}`)
    }
    if (!graph.exercises[edge.to]) {
      errors.push(`Global edge ${edge.id} references non-existent exercise: ${edge.to}`)
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}