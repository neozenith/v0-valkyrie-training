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
}: WorkoutSequenceVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const numExercises = workoutExercises.length

  const sequence: number[] = React.useMemo(() => {
    const seq: number[] = []
    if (numExercises === 0) return []

    if (style === "hiit") {
      for (let s = 0; s < sets; s++) {
        for (let e = 0; e < numExercises; e++) {
          seq.push(e)
        }
      }
    } else {
      // tabata
      for (let e = 0; e < numExercises; e++) {
        for (let s = 0; s < sets; s++) {
          seq.push(e)
        }
      }
    }
    return seq
  }, [numExercises, sets, style])

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

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`

  const getIcon = (type: DetailedInterval["type"]) => {
    switch (type) {
      case "work":
        return <Zap className="h-4 w-4 text-green-400" />
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
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
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
            {sequence.map((exerciseIndex, i) => {
              const isCompleted = i < completedIntervals
              const colorClass = isCompleted ? "bg-slate-600 opacity-50" : colors[exerciseIndex % colors.length]

              return (
                <div
                  key={`${style}-${i}-${exerciseIndex}`}
                  className={`w-6 h-6 flex items-center justify-center rounded text-white text-xs font-bold shadow-inner shadow-black/20 transition-colors duration-500 ${colorClass}`}
                  title={`Exercise ${exerciseIndex + 1}`}
                >
                  {exerciseIndex + 1}
                </div>
              )
            })}
            {sequence.length === 0 && <p className="text-slate-400 text-sm">Your workout sequence will appear here.</p>}
          </div>
        )}

        {isExpanded && (
          <div className="p-3 bg-slate-900/50 rounded-lg max-h-60 overflow-y-auto space-y-2">
            {detailedSequence.map((interval, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-2 bg-slate-800/50 rounded-md">
                {getIcon(interval.type)}
                <div className="flex-1">
                  <span
                    className={`font-medium ${
                      interval.type === "work"
                        ? colors[interval.exerciseIndex! % colors.length].replace("bg-", "text-")
                        : "text-white"
                    }`}
                  >
                    {interval.type === "work" ? interval.exerciseName : interval.type === "rest" ? "Rest" : "Set Rest"}
                  </span>
                </div>
                <span className="font-mono text-slate-400">{formatTime(interval.duration)}</span>
              </div>
            ))}
            {detailedSequence.length === 0 && (
              <p className="text-slate-400 text-sm text-center p-4">Your detailed sequence will appear here.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
