"use client"

import { CardContent } from "@/components/ui/card"
import { Card } from "@/components/ui/card"
import React from "react"

interface WorkoutSequenceVisualizerProps {
  numExercises: number
  sets: number
  style: "hiit" | "tabata"
  colors: string[]
  completedIntervals: number
}

export default function WorkoutSequenceVisualizer({
  numExercises,
  sets,
  style,
  colors,
  completedIntervals,
}: WorkoutSequenceVisualizerProps) {
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

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardContent className="p-4">
        <h3 className="text-lg font-light text-white text-center mb-3">Workout Sequence</h3>
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
      </CardContent>
    </Card>
  )
}
