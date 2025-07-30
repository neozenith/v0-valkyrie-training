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
  const [tooltip, setTooltip] = useState<{
    visible: boolean
    x: number
    y: number
    content: React.ReactNode
  }>({ visible: false, x: 0, y: 0, content: null })
  const [config, setConfig] = useState<GraphVisualizationConfig>({
    layout: 'fcose',
    showDifficulty: true,
    showEquipment: false,
    showModifiers: false,
    maxDepth: 3,
    colorScheme: 'equipment',
    groupByEquipment: true,
    nodeSpacing: 80,
    gravity: 0.35,
    animationDuration: 600,
    // Advanced fCoSE parameters
    edgeElasticity: 0.45,
    nodeRepulsionMultiplier: 1.0,
    numIterations: 2500,
    quality: 'default',
    coolingFactor: 0.99,
    // Layout structure options
    tile: true,
    packComponents: true,
    randomize: false,
    // Fine-tuning parameters
    initialTemp: 1000,
    minTemp: 1.0,
    ...defaultConfig
  })

  // Initialize Cytoscape
  useEffect(() => {
    if (!cyRef.current) return

    const cy = cytoscape({
      container: cyRef.current,
      style: getCytoscapeStyle(),
      layout: getLayoutConfig(config.layout),
      minZoom: 0.003,
      maxZoom: 2.5,
      wheelSensitivity: 0.2
    })

    cyInstance.current = cy

    // Helper function to find all connected elements in the subgraph
    const findConnectedSubgraph = (startElement: NodeSingular | EdgeSingular) => {
      const visited = new Set<string>()
      const connectedNodes = cy.collection()
      const connectedEdges = cy.collection()
      const queue: (NodeSingular | EdgeSingular)[] = [startElement]
      
      while (queue.length > 0) {
        const current = queue.shift()!
        const currentId = current.id()
        
        if (visited.has(currentId)) continue
        visited.add(currentId)
        
        if (current.isNode()) {
          connectedNodes.merge(current)
          // Add all connected edges to the queue
          current.connectedEdges().forEach((edge: EdgeSingular) => {
            if (!visited.has(edge.id())) {
              queue.push(edge)
            }
          })
        } else if (current.isEdge()) {
          connectedEdges.merge(current)
          // Add all connected nodes to the queue
          current.connectedNodes().forEach((node: NodeSingular) => {
            if (!visited.has(node.id())) {
              queue.push(node)
            }
          })
        }
      }
      
      return { nodes: connectedNodes, edges: connectedEdges }
    }

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const node = evt.target as NodeSingular
      const nodeId = node.id()
      setSelectedNode(nodeId)
      
      // Clear all previous states
      cy.elements().removeClass('highlighted connected dimmed')
      
      // Find the entire connected subgraph
      const subgraph = findConnectedSubgraph(node)
      
      // Highlight the selected node
      node.addClass('highlighted')
      
      // Mark all connected elements
      subgraph.nodes.not(node).addClass('connected')
      subgraph.edges.addClass('connected')
      
      // Dim all other elements
      const allConnected = subgraph.nodes.union(subgraph.edges)
      cy.elements().not(allConnected).addClass('dimmed')
    })

    cy.on('tap', 'edge', (evt) => {
      const edge = evt.target as EdgeSingular
      
      // Clear all previous states
      cy.elements().removeClass('highlighted connected dimmed')
      
      // Find the entire connected subgraph
      const subgraph = findConnectedSubgraph(edge)
      
      // Highlight the selected edge
      edge.addClass('highlighted')
      
      // Mark all connected elements
      subgraph.nodes.addClass('connected')
      subgraph.edges.not(edge).addClass('connected')
      
      // Dim all other elements
      const allConnected = subgraph.nodes.union(subgraph.edges)
      cy.elements().not(allConnected).addClass('dimmed')
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        // Clicked on background, clear all highlighting
        setSelectedNode(null)
        cy.elements().removeClass('highlighted connected dimmed')
        setTooltip({ visible: false, x: 0, y: 0, content: null })
      }
    })

    // Tooltip event handlers
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target as NodeSingular
      const nodeId = node.id()
      const exercise = graphData.exercises[nodeId]
      
      if (exercise) {
        const position = evt.renderedPosition || evt.position
        const container = cyRef.current?.getBoundingClientRect()
        
        if (container) {
          setTooltip({
            visible: true,
            x: container.left + position.x + 10,
            y: container.top + position.y - 10,
            content: (
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg max-w-xs">
                <h4 className="font-semibold text-white mb-2">{exercise.name}</h4>
                <div className="space-y-1 text-sm">
                  <div className="text-slate-300">
                    <span className="text-slate-400">Difficulty:</span> {graphManager.current.calculateDifficultyScore(nodeId).toFixed(1)}/10
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Equipment:</span> {exercise.equipment.join(', ')}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Muscles:</span> {exercise.targetMuscles.slice(0, 3).join(', ')}
                    {exercise.targetMuscles.length > 3 && '...'}
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-400">Path Depth:</span> {node.data('pathDepth') || 0}/{node.data('maxPathDepth') || 0}
                  </div>
                </div>
              </div>
            )
          })
        }
      }
    })

    cy.on('mouseout', 'node', () => {
      setTooltip({ visible: false, x: 0, y: 0, content: null })
    })

    cy.on('mouseover', 'edge', (evt) => {
      const edge = evt.target as EdgeSingular
      const edgeData = edge.data()
      
      const position = evt.renderedPosition || evt.position
      const container = cyRef.current?.getBoundingClientRect()
      
      if (container) {
        const sourceExercise = graphData.exercises[edgeData.source]
        const targetExercise = graphData.exercises[edgeData.target]
        
        setTooltip({
          visible: true,
          x: container.left + position.x + 10,
          y: container.top + position.y - 10,
          content: (
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg max-w-sm">
              <h4 className="font-semibold text-white mb-2">Exercise Relationship</h4>
              <div className="space-y-2 text-sm">
                <div className="text-slate-300">
                  <span className="text-slate-400">From:</span> {sourceExercise?.name || edgeData.source}
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">To:</span> {targetExercise?.name || edgeData.target}
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">Type:</span> {edgeData.relationship}
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-400">Difficulty Change:</span> 
                  <span className={edgeData.difficultyChange > 0 ? 'text-green-400' : edgeData.difficultyChange < 0 ? 'text-red-400' : 'text-slate-300'}>
                    {edgeData.difficultyChange > 0 ? '+' : ''}{edgeData.difficultyChange}
                  </span>
                </div>
                {edgeData.reason && (
                  <div className="text-slate-300">
                    <span className="text-slate-400">Reason:</span> {edgeData.reason}
                  </div>
                )}
              </div>
            </div>
          )
        })
      }
    })

    cy.on('mouseout', 'edge', () => {
      setTooltip({ visible: false, x: 0, y: 0, content: null })
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

  // Generate HSV-based colors for equipment
  const generateEquipmentColor = (equipment: string, alpha: number = 1): string => {
    const equipmentTypes = [
      'bodyweight', 'dumbbells', 'barbell', 'kettlebells', 'pull-up-bar', 
      'rings', 'parallettes', 'resistance-bands', 'landmine', 'bench',
      'cable-machine', 'smith-machine', 'suspension-trainer', 'medicine-ball',
      'foam-roller', 'stability-ball', 'bosu-ball', 'battle-ropes', 'sleds'
    ]
    
    const index = equipmentTypes.indexOf(equipment)
    const hue = index >= 0 ? (index * 360 / equipmentTypes.length) : (equipment.charCodeAt(0) * 137.508) % 360
    const saturation = 70 // Good saturation for visibility
    const lightness = 55 // Good lightness for visibility
    
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
  }

  const getCytoscapeStyle = () => {
    const baseStyles = [
      // Node styles
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center' as any,
          'text-halign': 'center' as any,
          'font-size': '10px',
          'font-weight': 'bold' as any,
          'color': '#ffffff',
          'text-outline-width': 2,
          'text-outline-color': '#000000',
          'background-color': '#6366f1',
          'width': '60px',
          'height': '60px',
          'border-width': 2,
          'border-color': '#4f46e5',
          'text-wrap': 'wrap' as any,
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
    // Equipment group (compound node) styles
    {
      selector: 'node.equipment-group',
      style: {
        'background-color': 'transparent',
        'border-width': 2,
        'border-style': 'dashed',
        'border-color': '#64748b',
        'label': 'data(label)',
        'text-valign': 'top',
        'text-halign': 'center' as any,
        'font-size': '16px',
        'font-weight': 'bold' as any,
        'color': '#e2e8f0',
        'text-outline-width': 2,
        'text-outline-color': '#1e293b',
        'padding': '20px',
        'z-index': 0
      }
    },
    // Highlighted states
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 4,
        'border-color': '#ffffff',
        'z-index': 100,
        'opacity': 1,
        'width': '70px',
        'height': '70px'
      }
    },
    {
      selector: 'node.connected',
      style: {
        'opacity': 1,
        'border-width': 3,
        'border-color': '#fbbf24',
        'z-index': 90
      }
    },
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.2,
        'z-index': 1
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
      selector: 'edge.highlighted',
      style: {
        'opacity': 1,
        'width': 5,
        'line-color': '#ffffff',
        'target-arrow-color': '#ffffff',
        'z-index': 100
      }
    },
    {
      selector: 'edge.connected',
      style: {
        'opacity': 1,
        'width': 4,
        'line-color': '#fbbf24',
        'target-arrow-color': '#fbbf24',
        'z-index': 90
      }
    },
    {
      selector: 'edge.dimmed',
      style: {
        'opacity': 0.15,
        'z-index': 1
      }
    }
  ]

  // Add dynamic equipment color styles
  const equipmentTypes = [
    'bodyweight', 'dumbbells', 'barbell', 'kettlebells', 'pull-up-bar', 
    'rings', 'parallettes', 'resistance-bands', 'landmine', 'bench',
    'cable-machine', 'smith-machine', 'suspension-trainer', 'medicine-ball',
    'foam-roller', 'stability-ball', 'bosu-ball', 'battle-ropes', 'sleds'
  ]

  equipmentTypes.forEach(equipment => {
    const color = generateEquipmentColor(equipment)
    const borderColor = generateEquipmentColor(equipment, 0.8)
    
    baseStyles.push({
      selector: `node.equipment-${equipment}`,
      style: {
        'background-color': color,
        'border-color': borderColor
      }
    })
  })

  return baseStyles
}

  const getLayoutConfig = (layout: string) => {
    const baseConfig = {
      name: layout === 'hierarchical' ? 'dagre' : 
            layout === 'force-directed' ? 'fcose' : 
            layout === 'fcose' ? 'fcose' : 
            layout,
      animate: true,
      animationDuration: config.animationDuration || 500,
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
          // Quality vs Performance (tunable)
          quality: config.quality || 'proof',
          
          // Separation (tunable)
          idealEdgeLength: config.nodeSpacing || 80,
          edgeElasticity: config.edgeElasticity || 0.45,
          
          // Force Strengths (tunable repulsion)
          nodeRepulsion: (_node: any) => (config.nodeSpacing || 80) * 75 * (config.nodeRepulsionMultiplier || 1.0),
          nodeOverlap: (config.nodeSpacing || 80) * 0.25,
          
          // Layout options (tunable)
          randomize: config.randomize ?? false,
          tile: config.tile ?? true,
          tilingPaddingVertical: Math.max(10, (config.nodeSpacing || 80) * 0.125),
          tilingPaddingHorizontal: Math.max(10, (config.nodeSpacing || 80) * 0.125),
          
          // Gravity (tunable)
          gravity: config.gravity || 0.25,
          gravityRangeCompound: (config.gravity || 0.25) * 6,
          
          // Compound node settings (tunable)
          packComponents: config.packComponents ?? true,
          
          // fCoSE specific compound settings
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          allowNodesInsideCompound: true,
          
          // Incremental layout (tunable iterations)
          step: 'all',
          numIter: config.numIterations || 2500,
          
          // Cooling (tunable)
          initialTemp: config.initialTemp || 1000,
          coolingFactor: config.coolingFactor || 0.99,
          minTemp: config.minTemp || 1.0,
          
          // Initial positions
          fixedNodeConstraint: undefined,
          alignmentConstraint: undefined,
          relativePlacementConstraint: undefined,
          
          // Animation
          animate: true,
          animationDuration: config.animationDuration || 800,
          animationEasing: 'ease-out'
        }
      case 'fcose':
        return {
          ...baseConfig,
          name: 'fcose',
          // Optimized for exercise relationship graphs (tunable quality)
          quality: config.quality || 'default',
          
          // Tunable clustering for related exercises
          idealEdgeLength: config.nodeSpacing || 80,
          edgeElasticity: config.edgeElasticity || 0.45,
          
          // Tunable repulsion for readability
          nodeRepulsion: (_node: any) => (config.nodeSpacing || 80) * 56.25 * (config.nodeRepulsionMultiplier || 1.0),
          nodeOverlap: Math.max(10, (config.nodeSpacing || 80) * 0.125),
          
          // Compact layout with tunable spacing
          tile: config.tile ?? true,
          tilingPaddingVertical: Math.max(5, (config.nodeSpacing || 80) * 0.0625),
          tilingPaddingHorizontal: Math.max(5, (config.nodeSpacing || 80) * 0.0625),
          randomize: config.randomize ?? false,
          
          // Tunable gravity to center groups
          gravity: config.gravity || 0.35,
          gravityRangeCompound: (config.gravity || 0.35) * 5.7,
          
          // Component packing (tunable)
          packComponents: config.packComponents ?? true,
          
          // fCoSE specific compound settings
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          allowNodesInsideCompound: true,
          
          // Tunable animation
          animate: true,
          animationDuration: config.animationDuration || 600,
          animationEasing: 'ease-in-out',
          
          // Better convergence with tunable parameters
          initialTemp: config.initialTemp || 1000,
          coolingFactor: config.coolingFactor || 0.99,
          minTemp: config.minTemp || 1.0,
          numIter: config.numIterations || 2500
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
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(0, -100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}

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
                  <SelectItem value="force-directed" className="text-white hover:bg-slate-600">Force Directed (Advanced)</SelectItem>  
                  <SelectItem value="fcose" className="text-white hover:bg-slate-600">fCoSE (Optimized)</SelectItem>
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

          {/* Equipment Grouping Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="groupByEquipment"
              checked={config.groupByEquipment}
              onChange={(e) => setConfig({...config, groupByEquipment: e.target.checked})}
              className="rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="groupByEquipment" className="text-sm text-slate-300">
              Group exercises by equipment type
            </label>
          </div>

          {/* Layout Tuning Controls */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300">Basic Layout Tuning</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex justify-between">
                  Node Spacing
                  <span className="text-purple-300">{config.nodeSpacing}</span>
                </label>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="10"
                  value={config.nodeSpacing || 80}
                  onChange={(e) => setConfig({...config, nodeSpacing: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex justify-between">
                  Gravity
                  <span className="text-purple-300">{config.gravity}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.gravity || 0.35}
                  onChange={(e) => setConfig({...config, gravity: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex justify-between">
                  Animation Duration (ms)
                  <span className="text-purple-300">{config.animationDuration}</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={config.animationDuration || 600}
                  onChange={(e) => setConfig({...config, animationDuration: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                />
              </div>
            </div>
          </div>

          {/* Advanced fCoSE Controls */}
          {(config.layout === 'fcose' || config.layout === 'force-directed') && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-slate-300">Advanced fCoSE Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-400 flex justify-between">
                    Edge Elasticity
                    <span className="text-purple-300">{config.edgeElasticity?.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={config.edgeElasticity || 0.45}
                    onChange={(e) => setConfig({...config, edgeElasticity: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <p className="text-xs text-slate-500">Controls edge stiffness</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400 flex justify-between">
                    Node Repulsion
                    <span className="text-purple-300">{config.nodeRepulsionMultiplier?.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={config.nodeRepulsionMultiplier || 1.0}
                    onChange={(e) => setConfig({...config, nodeRepulsionMultiplier: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <p className="text-xs text-slate-500">Node separation force</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400 flex justify-between">
                    Iterations
                    <span className="text-purple-300">{config.numIterations}</span>
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="250"
                    value={config.numIterations || 2500}
                    onChange={(e) => setConfig({...config, numIterations: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <p className="text-xs text-slate-500">Quality vs speed</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400">Algorithm Quality</label>
                  <select
                    value={config.quality || 'default'}
                    onChange={(e) => setConfig({...config, quality: e.target.value as 'default' | 'proof'})}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm"
                  >
                    <option value="default">Default (Fast)</option>
                    <option value="proof">Proof (High Quality)</option>
                  </select>
                  <p className="text-xs text-slate-500">Algorithm precision</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-400 flex justify-between">
                    Cooling Factor
                    <span className="text-purple-300">{config.coolingFactor?.toFixed(3)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.90"
                    max="0.99"
                    step="0.005"
                    value={config.coolingFactor || 0.99}
                    onChange={(e) => setConfig({...config, coolingFactor: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                  <p className="text-xs text-slate-500">Convergence speed</p>
                </div>
              </div>

              {/* Expert Settings */}
              <div className="mt-6 pt-4 border-t border-slate-600">
                <h5 className="text-sm font-medium text-slate-300 mb-4">Expert Settings</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={config.tile ?? true}
                        onChange={(e) => setConfig({...config, tile: e.target.checked})}
                        className="mr-2"
                      />
                      Grid Layout
                    </label>
                    <p className="text-xs text-slate-500">Arrange components in grid</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={config.packComponents ?? true}
                        onChange={(e) => setConfig({...config, packComponents: e.target.checked})}
                        className="mr-2"
                      />
                      Pack Components
                    </label>
                    <p className="text-xs text-slate-500">Tightly pack disconnected groups</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={config.randomize ?? false}
                        onChange={(e) => setConfig({...config, randomize: e.target.checked})}
                        className="mr-2"
                      />
                      Randomize Start
                    </label>
                    <p className="text-xs text-slate-500">Start with random positions</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400 flex justify-between">
                      Initial Temperature
                      <span className="text-purple-300">{config.initialTemp}</span>
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={config.initialTemp || 1000}
                      onChange={(e) => setConfig({...config, initialTemp: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                    />
                    <p className="text-xs text-slate-500">Starting simulation energy</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-slate-400 flex justify-between">
                      Minimum Temperature
                      <span className="text-purple-300">{config.minTemp}</span>
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={config.minTemp || 1.0}
                      onChange={(e) => setConfig({...config, minTemp: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                    />
                    <p className="text-xs text-slate-500">Stopping threshold</p>
                  </div>
                </div>
              </div>
            </div>
          )}

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