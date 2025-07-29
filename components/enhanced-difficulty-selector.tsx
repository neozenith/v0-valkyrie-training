"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown, 
  Equal,
  Zap,
  Clock,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Info
} from 'lucide-react'
import { ExerciseGraph, ExerciseEdge } from '@/types/exercise-graph'
import { ExerciseGraphManager } from '@/lib/exercise-graph-utils'
import { CatalogExercise } from '@/types/exercise-catalog'

interface EnhancedDifficultySelectorProps {
  exercise: CatalogExercise
  currentVariant: 'standard' | 'regression' | 'progression'
  graphData: ExerciseGraph
  availableModifiers?: string[]
  onDifficultyChange: (difficulty: number, exerciseId: string, modifiers?: string[]) => void
  className?: string
}

interface ExerciseOption {
  id: string
  name: string
  difficulty: number
  relationship: 'regression' | 'current' | 'progression'
  difficultyChange: number
  reason?: string
  requirements?: string[]
  distance: number // steps away from current exercise
}

export default function EnhancedDifficultySelector({
  exercise,
  currentVariant,
  graphData,
  availableModifiers = [],
  onDifficultyChange,
  className = ""
}: EnhancedDifficultySelectorProps) {
  const graphManager = useMemo(() => new ExerciseGraphManager(graphData), [graphData])
  const [selectedDifficulty, setSelectedDifficulty] = useState(5) // 0-10 scale
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])
  const [showDetails, setShowDetails] = useState(false)
  
  // Get exercise options around current difficulty level
  const exerciseOptions = useMemo(() => {
    const options: ExerciseOption[] = []
    const baseDifficulty = graphManager.calculateDifficultyScore(exercise.name)
    
    // Add current exercise
    options.push({
      id: exercise.name,
      name: exercise.name,
      difficulty: baseDifficulty,
      relationship: 'current',
      difficultyChange: 0,
      distance: 0
    })
    
    // Get regressions (easier exercises)
    const regressions = graphManager.getRegressions(exercise.name)
    for (const regression of regressions.slice(0, 3)) { // Limit to 3
      const regExercise = graphData.exercises[regression.from]
      if (regExercise) {
        const difficulty = graphManager.calculateDifficultyScore(regression.from)
        options.push({
          id: regression.from,
          name: regExercise.name,
          difficulty,
          relationship: 'regression',
          difficultyChange: -regression.difficultyChange,
          reason: regression.reason,
          requirements: regression.requirements,
          distance: 1
        })
      }
    }
    
    // Get progressions (harder exercises)
    const progressions = graphManager.getProgressions(exercise.name)
    for (const progression of progressions.slice(0, 3)) { // Limit to 3
      const progExercise = graphData.exercises[progression.to]
      if (progExercise) {
        const difficulty = graphManager.calculateDifficultyScore(progression.to)
        options.push({
          id: progression.to,
          name: progExercise.name,
          difficulty,
          relationship: 'progression',
          difficultyChange: progression.difficultyChange,
          reason: progression.reason,
          requirements: progression.requirements,
          distance: 1
        })
      }
    }
    
    // Sort by difficulty
    return options.sort((a, b) => a.difficulty - b.difficulty)
  }, [exercise, graphManager, graphData])

  // Update selected difficulty when exercise changes
  useEffect(() => {
    const currentDifficulty = graphManager.calculateDifficultyScore(exercise.name)
    setSelectedDifficulty(Math.max(0, Math.min(10, Math.round(currentDifficulty + 5)))) // Convert to 0-10 scale
  }, [exercise, graphManager])

  // Find the exercise option closest to selected difficulty
  const targetExercise = useMemo(() => {
    const targetDifficultyScore = selectedDifficulty - 5 // Convert back to relative scale
    let closestOption = exerciseOptions[0]
    let minDistance = Math.abs(closestOption.difficulty - targetDifficultyScore)
    
    for (const option of exerciseOptions) {
      const distance = Math.abs(option.difficulty - targetDifficultyScore)
      if (distance < minDistance) {
        minDistance = distance
        closestOption = option
      }
    }
    
    return closestOption
  }, [selectedDifficulty, exerciseOptions])

  const handleDifficultyChange = (value: number[]) => {
    const newDifficulty = value[0]
    setSelectedDifficulty(newDifficulty)
    
    // Find target exercise and apply modifiers
    const target = exerciseOptions.find(opt => {
      const targetScore = newDifficulty - 5
      return Math.abs(opt.difficulty - targetScore) <= 0.5
    }) || exerciseOptions[0]
    
    onDifficultyChange(newDifficulty, target.id, selectedModifiers)
  }

  const handleModifierToggle = (modifier: string) => {
    const newModifiers = selectedModifiers.includes(modifier)
      ? selectedModifiers.filter(m => m !== modifier)
      : [...selectedModifiers, modifier]
    
    setSelectedModifiers(newModifiers)
    onDifficultyChange(selectedDifficulty, targetExercise.id, newModifiers)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-400 bg-green-400/10 border-green-400/20'
    if (difficulty <= 4) return 'text-lime-400 bg-lime-400/10 border-lime-400/20'
    if (difficulty <= 6) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    if (difficulty <= 8) return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
    return 'text-red-400 bg-red-400/10 border-red-400/20'
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Beginner'
    if (difficulty <= 4) return 'Easy'
    if (difficulty <= 6) return 'Moderate'
    if (difficulty <= 8) return 'Hard'
    return 'Advanced'
  }

  const commonModifiers = [
    { id: 'slow-eccentric', name: 'Slow Down', icon: Clock, description: 'Slower lowering phase' },
    { id: 'explosive-concentric', name: 'Explosive', icon: Zap, description: 'Fast/explosive up phase' },
    { id: 'bottom-hold', name: 'Hold', icon: Pause, description: 'Pause at bottom' },
    { id: 'top-hold', name: 'Top Hold', icon: Pause, description: 'Pause at top' }
  ]

  return (
    <Card className={`bg-slate-800/30 border-slate-700/50 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white">Difficulty Selection</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-slate-400 hover:text-white p-1"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Difficulty Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Difficulty Level</span>
            <Badge className={getDifficultyColor(selectedDifficulty)}>
              {selectedDifficulty}/10 - {getDifficultyLabel(selectedDifficulty)}
            </Badge>
          </div>
          
          <div className="px-2">
            <Slider
              value={[selectedDifficulty]}
              onValueChange={handleDifficultyChange}
              max={10}
              min={0}
              step={0.5}
              className="w-full"
              data-testid="difficulty-slider"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Easier</span>
              <span>Harder</span>
            </div>
          </div>
        </div>

        {/* Target Exercise Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Target Exercise</span>
            {targetExercise.relationship !== 'current' && (
              <div className="flex items-center gap-1 text-xs">
                {targetExercise.relationship === 'progression' ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-orange-400" />
                )}
                <span className="text-slate-400">
                  {targetExercise.difficultyChange > 0 ? '+' : ''}{targetExercise.difficultyChange.toFixed(1)}
                </span>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
            <h4 className="font-medium text-white">{targetExercise.name}</h4>
            {targetExercise.reason && (
              <p className="text-xs text-slate-400 mt-1">{targetExercise.reason}</p>
            )}
            {targetExercise.requirements && targetExercise.requirements.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-300">Requirements:</p>
                <ul className="text-xs text-slate-400 mt-1">
                  {targetExercise.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-slate-500 mr-1">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Exercise Preview Range */}
        {showDetails && (
          <div className="space-y-3">
            <span className="text-sm text-slate-300">Exercise Progression</span>
            <div className="space-y-2">
              {exerciseOptions.map((option, idx) => (
                <div
                  key={option.id}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    option.id === targetExercise.id
                      ? 'bg-purple-600/20 border-purple-500/50'
                      : 'bg-slate-700/20 border-slate-600/30 hover:bg-slate-700/30'
                  }`}
                  onClick={() => setSelectedDifficulty(option.difficulty + 5)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {option.relationship === 'regression' && (
                        <TrendingDown className="h-3 w-3 text-orange-400" />
                      )}
                      {option.relationship === 'current' && (
                        <Equal className="h-3 w-3 text-slate-400" />
                      )}
                      {option.relationship === 'progression' && (
                        <TrendingUp className="h-3 w-3 text-green-400" />
                      )}
                      <span className="text-sm text-white">{option.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      {(option.difficulty + 5).toFixed(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="bg-slate-600" />

        {/* Quick Modifiers */}
        <div className="space-y-3">
          <span className="text-sm text-slate-300">Quick Modifiers</span>
          <div className="grid grid-cols-2 gap-2">
            {commonModifiers.map((modifier) => {
              const Icon = modifier.icon
              const isSelected = selectedModifiers.includes(modifier.id)
              
              return (
                <Button
                  key={modifier.id}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => handleModifierToggle(modifier.id)}
                  className={`h-auto p-3 transition-all ${
                    isSelected
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700/50'
                  }`}
                  data-testid={`modifier-${modifier.id}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="h-3 w-3" />
                    <span className="text-xs">{modifier.name}</span>
                  </div>
                </Button>
              )
            })}
          </div>
          
          {selectedModifiers.length > 0 && (
            <div className="text-xs text-slate-400">
              <span>Active: </span>
              {selectedModifiers.map(mod => {
                const modifier = commonModifiers.find(m => m.id === mod)
                return modifier?.description
              }).join(', ')}
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedDifficulty(5)
              setSelectedModifiers([])
              onDifficultyChange(5, exercise.name, [])
            }}
            className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50"
            data-testid="reset-difficulty-button"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset to Standard
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}