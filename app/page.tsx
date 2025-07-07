"use client"

import { useState } from "react"
import EquipmentSelection from "@/components/equipment-selection"
import WorkoutSetup from "@/components/workout-setup"
import WorkoutTimer from "@/components/workout-timer"
import WorkoutComplete from "@/components/workout-complete"
import type { Exercise } from "@/types/exercise"

type AppState = "equipment" | "setup" | "workout" | "complete"
type WorkoutStyle = "hiit" | "tabata"

export default function ValkyrieTraining() {
  const [appState, setAppState] = useState<AppState>("equipment")
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([])
  const [workoutSets, setWorkoutSets] = useState(1)
  const [workoutStyle, setWorkoutStyle] = useState<WorkoutStyle>("hiit")
  const [workoutStats, setWorkoutStats] = useState({
    totalTime: 0,
    exercises: [] as string[],
  })

  const handleEquipmentSelected = (equipment: string[]) => {
    setSelectedEquipment(equipment)
    setAppState("setup")
  }

  const handleWorkoutStart = (exercises: Exercise[], sets: number, style: WorkoutStyle) => {
    setWorkoutExercises(exercises)
    setWorkoutSets(sets)
    setWorkoutStyle(style)
    setAppState("workout")
  }

  const handleWorkoutComplete = () => {
    const workTime = 40
    const restTime = 20
    // The total time is the sum of all work and rest intervals, minus the final rest period.
    const totalTime = workoutExercises.length * workoutSets * (workTime + restTime) - restTime

    setWorkoutStats({
      totalTime: totalTime,
      exercises: workoutExercises.map((ex) => ex.name),
    })
    setAppState("complete")
  }

  const handleBackToEquipment = () => {
    setAppState("equipment")
  }

  const handleBackToSetup = () => {
    setAppState("setup")
  }

  const handleStartNewWorkout = () => {
    setAppState("equipment")
    setSelectedEquipment([])
    setWorkoutExercises([])
    setWorkoutSets(1)
  }

  switch (appState) {
    case "equipment":
      return <EquipmentSelection onEquipmentSelected={handleEquipmentSelected} />

    case "setup":
      return (
        <WorkoutSetup
          selectedEquipment={selectedEquipment}
          onWorkoutStart={handleWorkoutStart}
          onBack={handleBackToEquipment}
        />
      )

    case "workout":
      return (
        <WorkoutTimer
          exercises={workoutExercises}
          sets={workoutSets}
          workoutStyle={workoutStyle}
          onWorkoutComplete={handleWorkoutComplete}
          onBackToHome={handleBackToSetup}
        />
      )

    case "complete":
      return (
        <WorkoutComplete
          exercises={workoutStats.exercises}
          sets={workoutSets}
          totalTime={workoutStats.totalTime}
          onStartNew={handleStartNewWorkout}
        />
      )

    default:
      return <EquipmentSelection onEquipmentSelected={handleEquipmentSelected} />
  }
}
