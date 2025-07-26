"use client"

import { CardContent } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import React, { useState, useMemo } from "react"
import type { Exercise } from "@/types/exercise"
import { Zap, Coffee, Hourglass, ChevronDown, ChevronUp } from "lucide-react"

interface WorkoutSequenceVisualizerProps {
  workoutExercises: Exercise[]
  sets: number
  style: "hiit" | "tabata"
  colors: string[]
  completedIntervals: number
  workTime: number
  restTime: number
  setRestTime: number
  enableAutoScroll?: boolean
  currentPhase?: "work" | "rest" | "setRest"
  currentExerciseIndex?: number
  currentSet?: number
}

type DetailedInterval = {
  type: "work" | "rest" | "setRest"
  duration: number
  exerciseName?: string
  exerciseIndex?: number
}

export default function WorkoutSequenceVisualizer({
  workoutExercises,
  sets,
  style,
  colors,
  completedIntervals,
  workTime,
  restTime,
  setRestTime,
  enableAutoScroll = false,
  currentPhase,
  currentExerciseIndex,
  currentSet,
}: WorkoutSequenceVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const numExercises = workoutExercises.length
  const detailsRef = React.useRef<HTMLDivElement>(null)

  const detailedSequence: DetailedInterval[] = useMemo(() => {
    const detailed: DetailedInterval[] = []
    if (numExercises === 0 || sets === 0) return []

    if (style === "hiit") {
      for (let s = 0; s < sets; s++) {
        for (let e = 0; e < numExercises; e++) {
          detailed.push({
            type: "work",
            duration: workTime,
            exerciseName: workoutExercises[e].name,
            exerciseIndex: e,
          })
          detailed.push({ type: "rest", duration: restTime })
        }
        if (setRestTime > 0) {
          detailed.push({ type: "setRest", duration: setRestTime })
        }
      }
    } else {
      // tabata
      for (let e = 0; e < numExercises; e++) {
        for (let s = 0; s < sets; s++) {
          detailed.push({
            type: "work",
            duration: workTime,
            exerciseName: workoutExercises[e].name,
            exerciseIndex: e,
          })
          detailed.push({ type: "rest", duration: restTime })
        }
        if (setRestTime > 0) {
          detailed.push({ type: "setRest", duration: setRestTime })
        }
      }
    }
    return detailed
  }, [numExercises, sets, style, workTime, restTime, setRestTime, workoutExercises])

  // Calculate the current detailed interval index based on workout state
  const currentDetailedIndex = React.useMemo(() => {
    // If we have detailed workout state, use it for precise mapping
    if (currentPhase !== undefined && currentExerciseIndex !== undefined && currentSet !== undefined) {
      let targetIndex = 0
      
      if (style === "hiit") {
        // HIIT: sets x exercises
        for (let s = 1; s <= sets; s++) {
          for (let e = 0; e < numExercises; e++) {
            // Work interval
            if (s === currentSet && e === currentExerciseIndex && currentPhase === "work") {
              return targetIndex
            }
            if (s < currentSet || (s === currentSet && e < currentExerciseIndex)) {
              targetIndex++ // This work interval is completed
            } else if (s === currentSet && e === currentExerciseIndex && currentPhase !== "work") {
              targetIndex++ // Current work interval is completed, we're in rest
            }
            
            // Rest interval after work
            if (s === currentSet && e === currentExerciseIndex && currentPhase === "rest") {
              return targetIndex
            }
            if (s < currentSet || (s === currentSet && e < currentExerciseIndex) || 
                (s === currentSet && e === currentExerciseIndex && currentPhase === "setRest")) {
              targetIndex++ // This rest interval is completed
            }
          }
          
          // Set rest interval (if it exists)
          if (setRestTime > 0) {
            if (s === currentSet && currentPhase === "setRest") {
              return targetIndex
            }
            if (s < currentSet) {
              targetIndex++ // This set rest interval is completed
            }
          }
        }
      } else {
        // TABATA: exercises x sets
        for (let e = 0; e < numExercises; e++) {
          for (let s = 1; s <= sets; s++) {
            // Work interval
            if (e === currentExerciseIndex && s === currentSet && currentPhase === "work") {
              return targetIndex
            }
            if (e < currentExerciseIndex || (e === currentExerciseIndex && s < currentSet)) {
              targetIndex++ // This work interval is completed
            } else if (e === currentExerciseIndex && s === currentSet && currentPhase !== "work") {
              targetIndex++ // Current work interval is completed, we're in rest
            }
            
            // Rest interval after work
            if (e === currentExerciseIndex && s === currentSet && currentPhase === "rest") {
              return targetIndex
            }
            if (e < currentExerciseIndex || (e === currentExerciseIndex && s < currentSet) || 
                (e === currentExerciseIndex && s === currentSet && currentPhase === "setRest")) {
              targetIndex++ // This rest interval is completed
            }
          }
          
          // Set rest interval (if it exists)
          if (setRestTime > 0) {
            if (e === currentExerciseIndex && currentPhase === "setRest") {
              return targetIndex
            }
            if (e < currentExerciseIndex) {
              targetIndex++ // This set rest interval is completed
            }
          }
        }
      }
      
      return targetIndex
    }
    
    // Fallback to the old logic if detailed state is not available
    const workIntervalMapping: number[] = []
    detailedSequence.forEach((interval, index) => {
      if (interval.type === "work") {
        workIntervalMapping.push(index)
      }
    })
    
    if (completedIntervals >= workIntervalMapping.length) {
      return detailedSequence.length // All completed
    }
    return workIntervalMapping[completedIntervals] || 0
  }, [currentPhase, currentExerciseIndex, currentSet, style, sets, numExercises, setRestTime, detailedSequence, completedIntervals])

  // Auto-scroll to current exercise in expanded view (only when enabled)
  React.useEffect(() => {
    if (enableAutoScroll && isExpanded && detailsRef.current && currentDetailedIndex < detailedSequence.length) {
      const currentElement = detailsRef.current.children[currentDetailedIndex] as HTMLElement
      if (currentElement) {
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }
  }, [enableAutoScroll, isExpanded, currentDetailedIndex, detailedSequence.length])

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`

  const getIcon = (interval: DetailedInterval, isCompleted: boolean) => {
    switch (interval.type) {
      case "work":
        const exerciseIndex = interval.exerciseIndex!
        const colorClass = isCompleted ? "bg-slate-600 opacity-50" : colors[exerciseIndex % colors.length]
        return (
          <div
            className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs font-bold shadow-inner shadow-black/20 transition-colors duration-500 ${colorClass}`}
          >
            {exerciseIndex + 1}
          </div>
        )
      case "rest":
        return <Coffee className="h-4 w-4 text-blue-400" />
      case "setRest":
        return <Hourglass className="h-4 w-4 text-purple-400" />
    }
  }

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-light text-white text-center">Workout Sequence</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-black hover:bg-white"
          >
            {isExpanded ? (
              <>
                Hide Details <ChevronUp className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Show Details <ChevronDown className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {!isExpanded && (
          <div className="flex flex-wrap gap-1.5 justify-center p-3 bg-slate-900/50 rounded-lg min-h-[6rem] items-center">
            {detailedSequence.map((interval, i) => {
              const isCompleted = i < currentDetailedIndex
              
              if (interval.type === "work") {
                const exerciseIndex = interval.exerciseIndex!
                const colorClass = isCompleted ? "bg-slate-600 opacity-50" : colors[exerciseIndex % colors.length]
                return (
                  <div
                    key={`${style}-${i}-work-${exerciseIndex}`}
                    className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs font-bold shadow-inner shadow-black/20 transition-colors duration-500 ${colorClass}`}
                    title={`Exercise ${exerciseIndex + 1}: ${interval.exerciseName}`}
                  >
                    {exerciseIndex + 1}
                  </div>
                )
              } else if (interval.type === "rest") {
                return (
                  <div
                    key={`${style}-${i}-rest`}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors duration-500 ${
                      isCompleted ? "opacity-50" : ""
                    }`}
                    title="Rest"
                  >
                    <Coffee className="h-4 w-4 text-blue-400" />
                  </div>
                )
              } else {
                return (
                  <div
                    key={`${style}-${i}-setrest`}
                    className={`w-6 h-6 flex items-center justify-center rounded transition-colors duration-500 ${
                      isCompleted ? "opacity-50" : ""
                    }`}
                    title="Set Rest"
                  >
                    <Hourglass className="h-4 w-4 text-purple-400" />
                  </div>
                )
              }
            })}
            {detailedSequence.length === 0 && <p className="text-slate-400 text-sm">Your workout sequence will appear here.</p>}
          </div>
        )}

        {isExpanded && (
          <div ref={detailsRef} className="p-3 bg-slate-900/50 rounded-lg max-h-60 overflow-y-auto space-y-2">
            {detailedSequence.map((interval, i) => {
              const isCompleted = i < currentDetailedIndex
              const isCurrent = i === currentDetailedIndex
              return (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 text-sm p-2 rounded-md transition-colors duration-500 ${
                    isCurrent 
                      ? "bg-slate-700/70 border border-slate-500" 
                      : isCompleted 
                        ? "bg-slate-800/30 opacity-50" 
                        : "bg-slate-800/50"
                  }`}
                >
                  {getIcon(interval, isCompleted)}
                  <div className="flex-1">
                    <span
                      className={`font-medium transition-colors duration-500 ${
                        isCompleted ? "text-slate-400" : "text-white"
                      }`}
                    >
                      {interval.type === "work" ? interval.exerciseName : interval.type === "rest" ? "Rest" : "Set Rest"}
                    </span>
                  </div>
                  <span className={`font-mono transition-colors duration-500 ${
                    isCompleted ? "text-slate-500" : "text-slate-400"
                  }`}>
                    {formatTime(interval.duration)}
                  </span>
                </div>
              )
            })}
            {detailedSequence.length === 0 && (
              <p className="text-slate-400 text-sm text-center p-4">Your detailed sequence will appear here.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
