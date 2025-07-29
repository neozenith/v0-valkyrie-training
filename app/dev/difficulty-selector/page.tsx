"use client"

import { useState } from 'react'
import EnhancedDifficultySelector from '@/components/enhanced-difficulty-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Settings, Target } from 'lucide-react'
import Link from 'next/link'

// Import sample graph data
import sampleGraphData from '@/data/exercise-graph-sample.json'
import { ExerciseGraph } from '@/types/exercise-graph'
import { CatalogExercise } from '@/types/exercise-catalog'

export default function DifficultySelectorrDemoPage() {
  const graphData = sampleGraphData as ExerciseGraph
  
  // State for demo
  const [selectedExerciseId, setSelectedExerciseId] = useState('push-ups')
  const [currentDifficulty, setCurrentDifficulty] = useState(5)
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([])
  const [targetExerciseId, setTargetExerciseId] = useState('push-ups')
  
  const selectedExercise = graphData.exercises[selectedExerciseId]
  const targetExercise = graphData.exercises[targetExerciseId]
  
  // Get all exercises for the selector
  const allExercises = Object.entries(graphData.exercises).map(([id, exercise]) => ({
    id,
    name: exercise.name
  }))

  const handleDifficultyChange = (difficulty: number, exerciseId: string, modifiers?: string[]) => {
    setCurrentDifficulty(difficulty)
    setTargetExerciseId(exerciseId)
    setSelectedModifiers(modifiers || [])
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-500'
    if (difficulty <= 4) return 'bg-lime-500'
    if (difficulty <= 6) return 'bg-yellow-500'
    if (difficulty <= 8) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return 'Beginner'
    if (difficulty <= 4) return 'Easy'
    if (difficulty <= 6) return 'Moderate'
    if (difficulty <= 8) return 'Hard'
    return 'Advanced'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dev/graph-visualizer">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800/50 p-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Graph Visualizer
            </Button>
          </Link>
          <h1 className="text-3xl font-light text-white">Enhanced Difficulty Selector</h1>
          <div className="w-32" /> {/* Spacer */}
        </div>

        {/* Description */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-3">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Granular Control</h3>
                <p className="text-sm text-slate-400">
                  0-10 difficulty slider with intelligent exercise selection based on graph relationships.
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-3">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Quick Modifiers</h3>
                <p className="text-sm text-slate-400">
                  One-click access to common exercise modifications like tempo changes and holds.
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-3">
                  <ArrowLeft className="h-6 w-6 text-white transform rotate-90" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Progression Preview</h3>
                <p className="text-sm text-slate-400">
                  See the complete progression path and understand the relationship between exercises.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Exercise Selection & Difficulty Selector */}
          <div className="lg:col-span-2 space-y-6">
            {/* Exercise Selection */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Select Exercise to Modify</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedExerciseId} onValueChange={setSelectedExerciseId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {allExercises.map(exercise => (
                      <SelectItem 
                        key={exercise.id} 
                        value={exercise.id} 
                        className="text-white hover:bg-slate-600"
                      >
                        {exercise.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Enhanced Difficulty Selector */}
            <EnhancedDifficultySelector
              exercise={selectedExercise}
              currentVariant="standard"
              graphData={graphData}
              availableModifiers={['slow-eccentric', 'explosive-concentric', 'bottom-hold', 'top-hold']}
              onDifficultyChange={handleDifficultyChange}
            />
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Current Selection */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Current Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-white mb-2">Original Exercise</h4>
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-sm text-white">{selectedExercise.name}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedExercise.equipment.map(eq => (
                        <Badge key={eq} variant="secondary" className="text-xs bg-slate-600 text-slate-300">
                          {eq.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-white mb-2">Target Exercise</h4>
                  <div className="p-3 bg-slate-700/30 rounded-lg border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-white font-medium">{targetExercise.name}</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getDifficultyColor(currentDifficulty)}`}></div>
                        <span className="text-xs text-slate-400">
                          {currentDifficulty}/10 - {getDifficultyLabel(currentDifficulty)}
                        </span>
                      </div>
                    </div>
                    
                    {selectedModifiers.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-300 mb-1">Active Modifiers:</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedModifiers.map(modifier => (
                            <Badge key={modifier} className="text-xs bg-purple-600 text-white">
                              {modifier.replace('-', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exercise Details */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Exercise Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-1">Target Muscles</h5>
                  <div className="flex flex-wrap gap-1">
                    {targetExercise.targetMuscles.map(muscle => (
                      <Badge key={muscle} variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Form Cues</h5>
                  <ul className="space-y-1 text-xs text-slate-400">
                    {targetExercise.cues.slice(0, 4).map((cue, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-slate-500 mr-2 mt-1">•</span>
                        <span>{cue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Implementation Notes */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Implementation Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-400">
                <div>
                  <h5 className="text-slate-300 font-medium">Key Features:</h5>
                  <ul className="text-xs space-y-1 mt-1">
                    <li>• Graph-based exercise selection</li>
                    <li>• Real-time difficulty calculation</li>
                    <li>• Intelligent progression preview</li>
                    <li>• Modifier system integration</li>
                    <li>• Requirements validation</li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="text-slate-300 font-medium">Benefits:</h5>
                  <ul className="text-xs space-y-1 mt-1">
                    <li>• More granular difficulty control</li>
                    <li>• Clear progression pathways</li>
                    <li>• Contextual exercise relationships</li>
                    <li>• Integrated modifier system</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comparison */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white">Before vs After Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">Previous System</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-700/20 rounded border border-slate-600/30">
                    <div className="flex gap-2 justify-center">
                      <Button size="sm" variant="outline" className="border-orange-500/50 text-orange-400">
                        Easier
                      </Button>
                      <Button size="sm" className="bg-purple-600 text-white">
                        Standard  
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400">
                        Harder
                      </Button>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Only 3 difficulty options</li>
                    <li>• No progression preview</li>
                    <li>• No modifier integration</li>
                    <li>• Limited exercise context</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">Enhanced System</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-700/20 rounded border border-purple-500/30">
                    <div className="text-center text-sm text-purple-300 mb-2">
                      Difficulty: 6.5/10 - Hard
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full mb-2">
                      <div className="w-2/3 h-2 bg-purple-500 rounded-full"></div>
                    </div>
                    <div className="flex gap-1 justify-center">
                      <Badge className="text-xs bg-purple-600 text-white">Slow Down</Badge>
                      <Badge className="text-xs bg-purple-600 text-white">Hold</Badge>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• 0-10 granular difficulty scale</li>
                    <li>• Real-time progression preview</li>
                    <li>• Integrated modifier system</li>
                    <li>• Graph-based relationships</li>
                    <li>• Requirements & context</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}