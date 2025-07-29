"use client"

import React, { useEffect, useRef, useState } from 'react'
import cytoscape, { Core, EdgeSingular, NodeSingular } from 'cytoscape'
import dagre from 'cytoscape-dagre'
import fcose from 'cytoscape-fcose'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Filter,
  Target,
  Layers,
  Palette
} from 'lucide-react'
import { ExerciseGraph, GraphVisualizationConfig, ExerciseSubgraph } from '@/types/exercise-graph'
import { ExerciseGraphManager } from '@/lib/exercise-graph-utils'

// Register Cytoscape extensions
cytoscape.use(dagre)
cytoscape.use(fcose)

interface ExerciseGraphVisualizerProps {
  graphData: ExerciseGraph
  className?: string
  height?: number
  defaultConfig?: Partial<GraphVisualizationConfig>
}

export default function ExerciseGraphVisualizer({ 
  graphData, 
  className = "",
  height = 600,
  defaultConfig = {}
}: ExerciseGraphVisualizerProps) {
  const cyRef = useRef<HTMLDivElement>(null)
  const cyInstance = useRef<Core | null>(null)
  const graphManager = useRef(new ExerciseGraphManager(graphData))
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedSubgraph, setSelectedSubgraph] = useState<string>('all')
  const [config, setConfig] = useState<GraphVisualizationConfig>({
    layout: 'hierarchical',
    showDifficulty: true,
    showEquipment: false,
    showModifiers: false,
    maxDepth: 3,
    colorScheme: 'difficulty',
    ...defaultConfig
  })

  // Initialize Cytoscape
  useEffect(() => {
    if (!cyRef.current) return

    const cy = cytoscape({
      container: cyRef.current,
      style: getCytoscapeStyle(),
      layout: getLayoutConfig(config.layout),
      minZoom: 0.3,
      maxZoom: 2.5,
      wheelSensitivity: 0.2
    })

    cyInstance.current = cy

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target as NodeSingular
      const nodeId = node.id()
      setSelectedNode(nodeId)
      
      // Highlight connected nodes
      cy.elements().removeClass('highlighted connected')
      node.addClass('highlighted')
      node.connectedEdges().addClass('connected')
      node.connectedEdges().connectedNodes().addClass('connected')
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        // Clicked on background, clear selection
        setSelectedNode(null)
        cy.elements().removeClass('highlighted connected')
      }
    })

    return () => {
      cy.destroy()
    }
  }, [])

  // Update graph data when config changes
  useEffect(() => {
    if (!cyInstance.current) return

    const cy = cyInstance.current
    
    // Generate data based on current config and selected subgraph
    let filteredConfig = { ...config }
    if (selectedSubgraph !== 'all') {
      filteredConfig.focusExercise = graphData.subgraphs[selectedSubgraph]?.exercises[0]
      filteredConfig.maxDepth = 2 // Limit depth for subgraph view
    }

    const cytoscapeData = graphManager.current.generateCytoscapeData(filteredConfig)
    
    // Filter by subgraph if selected
    if (selectedSubgraph !== 'all') {
      const subgraph = graphData.subgraphs[selectedSubgraph]
      if (subgraph) {
        cytoscapeData.nodes = cytoscapeData.nodes.filter(node => 
          subgraph.exercises.includes(node.data.id)
        )
        cytoscapeData.edges = cytoscapeData.edges.filter(edge =>
          subgraph.exercises.includes(edge.data.source) && 
          subgraph.exercises.includes(edge.data.target)
        )
      }
    }

    cy.elements().remove()
    cy.add(cytoscapeData.nodes)
    cy.add(cytoscapeData.edges)
    
    // Apply layout
    const layout = cy.layout(getLayoutConfig(config.layout))
    layout.run()

  }, [config, selectedSubgraph, graphData])

  const getCytoscapeStyle = () => [
    // Node styles
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '10px',
        'font-weight': 'bold',
        'color': '#ffffff',
        'text-outline-width': 2,
        'text-outline-color': '#000000',
        'background-color': '#6366f1',
        'width': '60px',
        'height': '60px',
        'border-width': 2,
        'border-color': '#4f46e5',
        'text-wrap': 'wrap',
        'text-max-width': '80px'
      }
    },
    // Difficulty-based coloring
    {
      selector: 'node.difficulty-0',
      style: { 'background-color': '#22c55e', 'border-color': '#16a34a' }
    },
    {
      selector: 'node.difficulty-1', 
      style: { 'background-color': '#84cc16', 'border-color': '#65a30d' }
    },
    {
      selector: 'node.difficulty-2',
      style: { 'background-color': '#eab308', 'border-color': '#ca8a04' }
    },
    {
      selector: 'node.difficulty-3',
      style: { 'background-color': '#f97316', 'border-color': '#ea580c' }
    },
    {
      selector: 'node.difficulty-4',
      style: { 'background-color': '#ef4444', 'border-color': '#dc2626' }
    },
    {
      selector: 'node.difficulty-5',
      style: { 'background-color': '#dc2626', 'border-color': '#b91c1c' }
    },
    // Special node types
    {
      selector: 'node.entry-point',
      style: {
        'border-width': 4,
        'border-color': '#10b981',
        'border-style': 'double'
      }
    },
    {
      selector: 'node.landmark',
      style: {
        'width': '70px',
        'height': '70px',
        'border-width': 3,
        'border-color': '#f59e0b'
      }
    },
    // Highlighted states
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#ffffff',
        'z-index': 100
      }
    },
    {
      selector: 'node.connected',
      style: {
        'opacity': 0.8,
        'border-color': '#fbbf24'
      }
    },
    // Edge styles
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#64748b',
        'target-arrow-color': '#64748b',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'arrow-scale': 1.2
      }
    },
    {
      selector: 'edge.progression',
      style: {
        'line-color': '#22c55e',
        'target-arrow-color': '#22c55e'
      }
    },
    {
      selector: 'edge.regression',
      style: {
        'line-color': '#ef4444',
        'target-arrow-color': '#ef4444'
      }
    },
    {
      selector: 'edge.small-change',
      style: { 'width': 2 }
    },
    {
      selector: 'edge.medium-change',
      style: { 'width': 4 }
    },
    {
      selector: 'edge.large-change',
      style: { 'width': 6 }
    },
    {
      selector: 'edge.connected',
      style: {
        'opacity': 1,
        'z-index': 50
      }
    }
  ]

  const getLayoutConfig = (layout: string) => {
    const baseConfig = {
      name: layout === 'hierarchical' ? 'dagre' : layout === 'force-directed' ? 'fcose' : layout,
      animate: true,
      animationDuration: 500,
      fit: true,
      padding: 50
    }

    switch (layout) {
      case 'hierarchical':
        return {
          ...baseConfig,
          name: 'dagre',
          rankDir: 'TB',
          spacingFactor: 1.2,
          nodeSep: 80,
          rankSep: 100
        }
      case 'circular':
        return {
          ...baseConfig,
          name: 'circle',
          radius: 200
        }
      case 'force-directed':
        return {
          ...baseConfig,
          name: 'fcose',
          idealEdgeLength: 100,
          nodeRepulsion: 4000,
          nodeOverlap: 10
        }
      case 'grid':
        return {
          ...baseConfig,
          name: 'grid',
          rows: 3
        }
      default:
        return baseConfig
    }
  }

  const handleZoomIn = () => {
    cyInstance.current?.zoom(cyInstance.current.zoom() * 1.25)
  }

  const handleZoomOut = () => {
    cyInstance.current?.zoom(cyInstance.current.zoom() * 0.8)
  }

  const handleReset = () => {
    cyInstance.current?.fit(undefined, 50)
    setSelectedNode(null)
    cyInstance.current?.elements().removeClass('highlighted connected')
  }

  const handleCenterOnNode = () => {
    if (selectedNode && cyInstance.current) {
      const node = cyInstance.current.getElementById(selectedNode)
      cyInstance.current.center(node)
      cyInstance.current.zoom(1.5)
    }
  }

  const handleExportPNG = () => {
    if (cyInstance.current) {
      const png = cyInstance.current.png({ 
        output: 'blob',
        bg: '#0f172a',
        full: true,
        scale: 2
      })
      
      const link = document.createElement('a')
      link.download = `exercise-graph-${selectedSubgraph}.png`
      link.href = URL.createObjectURL(png)
      link.click()
    }
  }

  const selectedExercise = selectedNode ? graphData.exercises[selectedNode] : null
  const subgraphOptions = [
    { value: 'all', label: 'All Exercises' },
    ...Object.values(graphData.subgraphs).map(sg => ({
      value: sg.id,
      label: sg.name
    }))
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <Card className="bg-slate-800/30 border-slate-700/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Exercise Graph Visualizer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subgraph and Layout Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Focus</label>
              <Select value={selectedSubgraph} onValueChange={setSelectedSubgraph}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {subgraphOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-white hover:bg-slate-600">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Layout</label>
              <Select value={config.layout} onValueChange={(value: any) => setConfig({...config, layout: value})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="hierarchical" className="text-white hover:bg-slate-600">Hierarchical</SelectItem>
                  <SelectItem value="circular" className="text-white hover:bg-slate-600">Circular</SelectItem>
                  <SelectItem value="force-directed" className="text-white hover:bg-slate-600">Force Directed</SelectItem>
                  <SelectItem value="grid" className="text-white hover:bg-slate-600">Grid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Color By</label>
              <Select value={config.colorScheme} onValueChange={(value: any) => setConfig({...config, colorScheme: value})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="difficulty" className="text-white hover:bg-slate-600">Difficulty</SelectItem>
                  <SelectItem value="equipment" className="text-white hover:bg-slate-600">Equipment</SelectItem>
                  <SelectItem value="movement" className="text-white hover:bg-slate-600">Movement</SelectItem>
                  <SelectItem value="subgraph" className="text-white hover:bg-slate-600">Subgraph</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Max Depth</label>
              <Select value={config.maxDepth.toString()} onValueChange={(value) => setConfig({...config, maxDepth: parseInt(value)})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="1" className="text-white hover:bg-slate-600">1 Level</SelectItem>
                  <SelectItem value="2" className="text-white hover:bg-slate-600">2 Levels</SelectItem>
                  <SelectItem value="3" className="text-white hover:bg-slate-600">3 Levels</SelectItem>
                  <SelectItem value="5" className="text-white hover:bg-slate-600">5 Levels</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-slate-600" />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomIn}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              data-testid="zoom-in-button"
            >
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom In
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomOut}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              data-testid="zoom-out-button"
            >
              <ZoomOut className="h-4 w-4 mr-1" />
              Zoom Out
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleReset}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              data-testid="reset-view-button"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset View
            </Button>

            {selectedNode && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCenterOnNode}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                data-testid="center-on-node-button"
              >
                <Target className="h-4 w-4 mr-1" />
                Center on Selected
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPNG}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              data-testid="export-png-button"
            >
              <Download className="h-4 w-4 mr-1" />
              Export PNG
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Graph Canvas */}
        <Card className="lg:col-span-3 bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-2">
            <div 
              ref={cyRef} 
              style={{ height: `${height}px` }}
              className="bg-slate-900 rounded border border-slate-700"
              data-testid="cytoscape-canvas"
            />
          </CardContent>
        </Card>

        {/* Exercise Details Panel */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white">
              {selectedExercise ? 'Exercise Details' : 'Graph Legend'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedExercise ? (
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-white mb-1">{selectedExercise.name}</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedExercise.equipment.map(eq => (
                      <Badge key={eq} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                        {eq.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-1">Target Muscles</h5>
                  <div className="flex flex-wrap gap-1">
                    {selectedExercise.targetMuscles.map(muscle => (
                      <Badge key={muscle} variant="outline" className="text-xs border-slate-600 text-slate-400">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Form Cues</h5>
                  <ul className="space-y-1 text-xs text-slate-400">
                    {selectedExercise.cues.slice(0, 3).map((cue, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-slate-500 mr-1">•</span>
                        {cue}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Progression/Regression info */}
                <div>
                  <h5 className="text-sm font-medium text-slate-300 mb-1">Connected Exercises</h5>
                  <div className="space-y-1 text-xs">
                    {graphManager.current.getProgressions(selectedNode!).length > 0 && (
                      <div className="text-green-400">
                        ↗ {graphManager.current.getProgressions(selectedNode!).length} progressions
                      </div>
                    )}
                    {graphManager.current.getRegressions(selectedNode!).length > 0 && (
                      <div className="text-red-400">
                        ↙ {graphManager.current.getRegressions(selectedNode!).length} regressions
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <h5 className="font-medium text-slate-300 mb-2">Node Colors (Difficulty)</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-slate-400">Beginner (0-1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-lime-500"></div>
                      <span className="text-slate-400">Easy (2-3)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-slate-400">Moderate (4-5)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-slate-400">Hard (6-7)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-slate-400">Advanced (8-10)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-slate-300 mb-2">Special Nodes</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-green-500"></div>
                      <span className="text-slate-400">Entry Points</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-yellow-500"></div>
                      <span className="text-slate-400">Landmarks</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-slate-300 mb-2">Edges</h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-1 bg-green-500"></div>
                      <span className="text-slate-400">Progression</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-1 bg-red-500"></div>
                      <span className="text-slate-400">Regression</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-1 bg-slate-500"></div>
                      <span className="text-slate-400">Variation</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">
                  Click on a node to see exercise details and highlight connections.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}