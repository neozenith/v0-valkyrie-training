"use client"

import { useState, useEffect } from 'react'
import ExerciseGraphVisualizer from '@/components/exercise-graph-visualizer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Database, Layers, Network, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { loadAndMigrateFullCatalog } from '@/lib/migrate-to-graph'
import { ExerciseGraph } from '@/types/exercise-graph'

export default function GraphVisualizerDemoPage() {
  const [selectedTab, setSelectedTab] = useState<'visualizer' | 'data' | 'stats'>('visualizer')
  const [graphData, setGraphData] = useState<ExerciseGraph | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function loadData() {
      try {
        const migratedData = await loadAndMigrateFullCatalog()
        setGraphData(migratedData)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load exercise catalog:', err)
        setError('Failed to load exercise catalog')
        setIsLoading(false)
      }
    }
    loadData()
  }, [])
  
  // Calculate statistics
  const stats = graphData ? {
    totalExercises: Object.keys(graphData.exercises).length,
    totalSubgraphs: Object.keys(graphData.subgraphs).length,
    totalEdges: Object.values(graphData.subgraphs).reduce((sum, sg) => sum + sg.edges.length, 0) + graphData.globalEdges.length,
    movementPatterns: Array.from(new Set(Object.values(graphData.subgraphs).map(sg => sg.primaryMovementPattern))),
    equipment: Array.from(new Set(Object.values(graphData.exercises).flatMap(ex => ex.equipment)))
  } : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-800/50 p-2"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-light text-white">Exercise Graph Visualizer</h1>
          <div className="w-24" /> {/* Spacer */}
        </div>

        {/* Description */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-3">
                  <Network className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Graph-Based Relationships</h3>
                <p className="text-sm text-slate-400">
                  Exercises are connected through progression, regression, and variation relationships, 
                  forming a comprehensive training graph.
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-3">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Subgraph Organization</h3>
                <p className="text-sm text-slate-400">
                  Related exercises are grouped into subgraphs by movement pattern, 
                  making the system scalable and easy to navigate.
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-lg mb-3">
                  <Database className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Unified Edge System</h3>
                <p className="text-sm text-slate-400">
                  Progressions and regressions are stored as single edges that can be traversed 
                  in both directions, eliminating data duplication.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedTab === 'visualizer' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('visualizer')}
            className={selectedTab === 'visualizer' 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'border-slate-500 text-slate-300 hover:bg-slate-800/50'
            }
          >
            Visualizer
          </Button>
          <Button
            variant={selectedTab === 'stats' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('stats')}
            className={selectedTab === 'stats' 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'border-slate-500 text-slate-300 hover:bg-slate-800/50'
            }
          >
            Statistics
          </Button>
          <Button
            variant={selectedTab === 'data' ? 'default' : 'outline'}
            onClick={() => setSelectedTab('data')}
            className={selectedTab === 'data' 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'border-slate-500 text-slate-300 hover:bg-slate-800/50'
            }
          >
            Data Structure
          </Button>
        </div>

        {/* Content */}
        {selectedTab === 'visualizer' && (
          <div>
            {isLoading && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 text-purple-400 animate-spin mx-auto mb-4" />
                  <p className="text-slate-300">Loading full exercise catalog...</p>
                </CardContent>
              </Card>
            )}
            {error && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-12 text-center">
                  <p className="text-red-400">{error}</p>
                </CardContent>
              </Card>
            )}
            {graphData && !isLoading && !error && (
              <ExerciseGraphVisualizer 
                graphData={graphData}
                height={700}
                defaultConfig={{
                  layout: 'hierarchical',
                  colorScheme: 'difficulty',
                  maxDepth: 3,
                  showDifficulty: true
                }}
              />
            )}
          </div>
        )}

        {selectedTab === 'stats' && graphData && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overview Stats */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Graph Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-300">{stats.totalExercises}</div>
                    <div className="text-sm text-slate-400">Exercises</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-300">{stats.totalSubgraphs}</div>
                    <div className="text-sm text-slate-400">Subgraphs</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-300">{stats.totalEdges}</div>
                    <div className="text-sm text-slate-400">Relationships</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <div className="text-2xl font-bold text-purple-300">{stats.equipment.length}</div>
                    <div className="text-sm text-slate-400">Equipment Types</div>
                  </div>
                </div>
                {graphData.globalEdges.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-sm text-slate-400">
                      <span className="text-purple-300 font-medium">{graphData.globalEdges.length}</span> cross-subgraph relationships
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subgraph Details */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Subgraphs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {Object.values(graphData.subgraphs).sort((a, b) => b.exercises.length - a.exercises.length).map(subgraph => (
                  <div key={subgraph.id} className="border border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-white">{subgraph.name}</h4>
                      <Badge className="bg-purple-600 text-white">
                        {subgraph.exercises.length} exercises
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{subgraph.description}</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {subgraph.primaryMovementPattern}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {subgraph.edges.length} edges
                      </Badge>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                        Difficulty: {subgraph.difficulty.min}-{subgraph.difficulty.max}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Movement Patterns */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Movement Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.movementPatterns.map(pattern => (
                    <Badge key={pattern} className="bg-slate-700 text-slate-300 capitalize">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Equipment Types */}
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">Equipment Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.equipment.map(eq => (
                    <Badge key={eq} variant="outline" className="border-slate-600 text-slate-400 capitalize">
                      {eq.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedTab === 'data' && graphData && (
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg text-white">Graph Data Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-white mb-2">Key Features:</h4>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• <strong className="text-slate-300">Unified Edges:</strong> Single edge represents both progression and regression</li>
                    <li>• <strong className="text-slate-300">Subgraph Organization:</strong> Exercises grouped by movement pattern</li>
                    <li>• <strong className="text-slate-300">Difficulty Scoring:</strong> Numeric difficulty changes for algorithmic processing</li>
                    <li>• <strong className="text-slate-300">Equipment Integration:</strong> Automatic equipment requirement handling</li>
                    <li>• <strong className="text-slate-300">Modifier Support:</strong> Rules for applying exercise modifiers</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-white mb-2">Sample Edge Structure:</h4>
                  <pre className="bg-slate-900 p-4 rounded text-xs text-slate-300 overflow-x-auto">
{JSON.stringify(
  graphData.subgraphs[Object.keys(graphData.subgraphs)[0]]?.edges[0] || {
    "id": "edge-1",
    "from": "exercise-1",
    "to": "exercise-2", 
    "relationship": "progression",
    "difficultyChange": 0.5,
    "reason": "Progression reason"
  }, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-white mb-2">Benefits:</h4>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• <strong className="text-slate-300">Scalable:</strong> Easy to add new exercises and relationships</li>
                    <li>• <strong className="text-slate-300">Algorithmic:</strong> Supports path finding and difficulty calculation</li>
                    <li>• <strong className="text-slate-300">Maintainable:</strong> Clear separation of concerns with subgraphs</li>
                    <li>• <strong className="text-slate-300">Extensible:</strong> Supports modifiers, requirements, and custom metadata</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}