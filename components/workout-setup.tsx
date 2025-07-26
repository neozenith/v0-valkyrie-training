"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Exercise } from "@/types/exercise"
import exerciseData from "@/data/exercises.json"
import { ChevronDown, ChevronUp, RotateCcw, ArrowLeft } from "lucide-react"
import NumberControl from "./number-control"
import WorkoutSequenceVisualizer from "./workout-sequence-visualizer"

type WorkoutStyle = "hiit" | "tabata"

interface WorkoutSetupProps {
  selectedEquipment: string[]
  onWorkoutStart: (
    exercises: Exercise[],
    sets: number,
    style: WorkoutStyle,
    workTime: number,
    restTime: number,
    setRestTime: number,
  ) => void
  onBack: () => void
}

interface ExerciseVariant {
  exercise: Exercise
  selectedVariant: "standard" | "regression" | "progression"
}

const colorPalette = [
  "bg-rose-500",
  "bg-sky-500",
  "bg-teal-500",
  "bg-amber-500",
  "bg-fuchsia-500",
  "bg-indigo-500",
  "bg-lime-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-emerald-500",
]

export default function WorkoutSetup({ selectedEquipment, onWorkoutStart, onBack }: WorkoutSetupProps) {
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [workoutExercises, setWorkoutExercises] = useState<ExerciseVariant[]>([])
  const [selectedSets, setSelectedSets] = useState(2)
  const [selectedExercises, setSelectedExercises] = useState(5)
  const [workoutStyle, setWorkoutStyle] = useState<WorkoutStyle>("hiit")
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [workTime, setWorkTime] = useState(40)
  const [restTime, setRestTime] = useState(20)
  const [setRestTimeValue, setSetRestTimeValue] = useState(60)

  const effectiveEquipment = useMemo(() => {
    const list = [...selectedEquipment]
    if (selectedEquipment.includes("landmine") && !list.includes("barbell")) {
      list.push("barbell")
    }
    return list
  }, [selectedEquipment])

  useEffect(() => {
    const filtered = exerciseData.exercises.filter((exercise: Exercise) => {
      const hasAllEquipment = exercise.equipment.every((eq) => effectiveEquipment.includes(eq))
      if (!hasAllEquipment) return false

      if (exercise.equipment.includes("barbell") && !exercise.equipment.includes("landmine")) {
        if (!selectedEquipment.includes("barbell")) return false
      }

      return true
    })
    setAvailableExercises(filtered)
  }, [selectedEquipment, effectiveEquipment])

  useEffect(() => {
    regenerateWorkout()
  }, [availableExercises, selectedExercises])

  const totalWorkoutTime = useMemo(() => {
    const numExercises = workoutExercises.length
    if (numExercises === 0 || selectedSets === 0) return 0

    if (workoutStyle === "hiit") {
      // Total time for one full set (circuit) including its final set rest
      const timePerSet = numExercises * (workTime + restTime) + setRestTimeValue
      return selectedSets * timePerSet
    } else {
      // Tabata
      // Total time for one full exercise (all sets) including its final set rest
      const timePerExercise = selectedSets * (workTime + restTime) + setRestTimeValue
      return numExercises * timePerExercise
    }
  }, [workoutExercises.length, selectedSets, workTime, restTime, setRestTimeValue, workoutStyle])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const regenerateWorkout = () => {
    if (availableExercises.length === 0) {
      setWorkoutExercises([])
      return
    }
    const shuffled = [...availableExercises].sort(() => 0.5 - Math.random())
    const selectedExerciseList = shuffled.slice(0, selectedExercises)

    setWorkoutExercises(
      selectedExerciseList.map((exercise) => ({
        exercise,
        selectedVariant: "standard",
      })),
    )
    setExpandedExercise(null)
  }

  const handleVariantChange = (exerciseIndex: number, variant: "standard" | "regression" | "progression") => {
    setWorkoutExercises((prev) =>
      prev.map((item, index) => (index === exerciseIndex ? { ...item, selectedVariant: variant } : item)),
    )
  }

  const toggleExerciseExpansion = (index: number) => {
    setExpandedExercise(expandedExercise === index ? null : index)
  }

  const handleStartWorkout = () => {
    const finalExercises = workoutExercises.map(({ exercise, selectedVariant }) => {
      if (selectedVariant === "regression") {
        return {
          ...exercise,
          id: `${exercise.id}-regression`,
          name: exercise.regression.name,
          cues: exercise.regression.cues,
        }
      } else if (selectedVariant === "progression") {
        return {
          ...exercise,
          id: `${exercise.id}-progression`,
          name: exercise.progression.name,
          cues: exercise.progression.cues,
        }
      }
      return exercise
    })

    onWorkoutStart(finalExercises, selectedSets, workoutStyle, workTime, restTime, setRestTimeValue)
  }

  const getVariantName = (exerciseVariant: ExerciseVariant) => {
    const { exercise, selectedVariant } = exerciseVariant
    switch (selectedVariant) {
      case "regression":
        return exercise.regression.name
      case "progression":
        return exercise.progression.name
      default:
        return exercise.name
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-300 hover:text-white hover:bg-slate-800/50 p-2"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl md:text-3xl font-light text-white">Workout Setup</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* Configuration Card */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <NumberControl label="Sets" value={selectedSets} min={1} max={5} onChange={setSelectedSets} />
              <NumberControl
                label="Exercises"
                value={selectedExercises}
                min={3}
                max={Math.min(10, availableExercises.length)}
                onChange={setSelectedExercises}
              />
              <div className="space-y-3">
                <h3 className="text-lg font-light text-white text-center">Style</h3>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant={workoutStyle === "hiit" ? "default" : "outline"}
                    onClick={() => setWorkoutStyle("hiit")}
                    className={`w-20 transition-all duration-300 ${
                      workoutStyle === "hiit"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    HIIT
                  </Button>
                  <Button
                    variant={workoutStyle === "tabata" ? "default" : "outline"}
                    onClick={() => setWorkoutStyle("tabata")}
                    className={`w-20 transition-all duration-300 ${
                      workoutStyle === "tabata"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    Tabata
                  </Button>
                </div>
                <p className="text-xs text-slate-400 text-center h-10 px-2">
                  {workoutStyle === "hiit"
                    ? "Circuit style. Complete one set of every exercise before starting the next set."
                    : "Focus style. Complete all sets for one exercise before moving to the next."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timing Setup Card */}
        <Card className="bg-slate-800/30 border-slate-700/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <NumberControl
                label="Work Time (s)"
                value={workTime}
                min={10}
                max={120}
                onChange={setWorkTime}
                step={5}
              />
              <NumberControl label="Rest Time (s)" value={restTime} min={5} max={90} onChange={setRestTime} step={5} />
              <NumberControl
                label="Set Rest (s)"
                value={setRestTimeValue}
                min={0}
                max={180}
                onChange={setSetRestTimeValue}
                step={5}
              />
            </div>
            <div className="mt-6 text-center border-t border-slate-700/50 pt-4">
              <h3 className="text-lg font-light text-white">Total Workout Time</h3>
              <p className="text-3xl font-mono text-purple-300 mt-1">{formatTime(totalWorkoutTime)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sequence Visualizer */}
        <WorkoutSequenceVisualizer
          workoutExercises={workoutExercises.map(({ exercise, selectedVariant }) => {
            if (selectedVariant === "regression") {
              return {
                ...exercise,
                id: `${exercise.id}-regression`,
                name: exercise.regression.name,
                cues: exercise.regression.cues,
              }
            } else if (selectedVariant === "progression") {
              return {
                ...exercise,
                id: `${exercise.id}-progression`,
                name: exercise.progression.name,
                cues: exercise.progression.cues,
              }
            }
            return exercise
          })}
          sets={selectedSets}
          style={workoutStyle}
          colors={colorPalette}
          completedIntervals={0}
          workTime={workTime}
          restTime={restTime}
          setRestTime={setRestTimeValue}
        />

        {/* Exercise List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-light text-white">Your Workout ({availableExercises.length} available)</h3>
            <Button
              variant="outline"
              onClick={regenerateWorkout}
              disabled={availableExercises.length === 0}
              className="border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white bg-transparent"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
          </div>

          {workoutExercises.length > 0 ? (
            <div className="space-y-3">
              {workoutExercises.map((exerciseVariant, index) => (
                <Card key={`${exerciseVariant.exercise.id}-${index}`} className="bg-slate-800/30 border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold shadow-inner shadow-black/20 ${
                              colorPalette[index % colorPalette.length]
                            }`}
                          >
                            {index + 1}
                          </Badge>
                          <div>
                            <h4 className="font-medium text-white">{getVariantName(exerciseVariant)}</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {exerciseVariant.exercise.equipment
                                .filter((eq) => eq !== "bodyweight")
                                .map((eq) => (
                                  <Badge
                                    key={eq}
                                    variant="secondary"
                                    className="text-xs capitalize bg-slate-700 text-slate-300"
                                  >
                                    {eq.replace("-", " ")}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        </div>

                        {expandedExercise === index && (
                          <div className="space-y-3 pt-3 pl-10 border-t border-slate-700/50 mt-3">
                            <div className="flex justify-start gap-2">
                              <Button
                                size="sm"
                                variant={exerciseVariant.selectedVariant === "regression" ? "default" : "outline"}
                                onClick={() => handleVariantChange(index, "regression")}
                                className={`transition-all duration-300 ${
                                  exerciseVariant.selectedVariant === "regression"
                                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                                    : "border-orange-500/50 text-orange-400 hover:bg-orange-600/20"
                                }`}
                              >
                                Easier
                              </Button>
                              <Button
                                size="sm"
                                variant={exerciseVariant.selectedVariant === "standard" ? "default" : "outline"}
                                onClick={() => handleVariantChange(index, "standard")}
                                className={`transition-all duration-300 ${
                                  exerciseVariant.selectedVariant === "standard"
                                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                                    : "border-slate-500 text-slate-300 hover:bg-slate-700"
                                }`}
                              >
                                Standard
                              </Button>
                              <Button
                                size="sm"
                                variant={exerciseVariant.selectedVariant === "progression" ? "default" : "outline"}
                                onClick={() => handleVariantChange(index, "progression")}
                                className={`transition-all duration-300 ${
                                  exerciseVariant.selectedVariant === "progression"
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "border-red-500/50 text-red-400 hover:bg-red-600/20"
                                }`}
                              >
                                Harder
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExerciseExpansion(index)}
                        className="text-slate-400 hover:text-white hover:bg-slate-700/50 flex items-center gap-1"
                      >
                        {expandedExercise === index ? (
                          <>
                            <span className="text-xs">Hide</span>
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <span className="text-xs">Modify Difficulty</span>
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-6 text-center text-slate-400">
                <p>No exercises available for the selected equipment.</p>
                <p className="text-sm mt-2">Try selecting more equipment or adjusting your choices.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Start Button */}
        <div className="text-center pt-4">
          <Button
            onClick={handleStartWorkout}
            size="lg"
            disabled={workoutExercises.length === 0}
            className="px-12 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 disabled:bg-slate-600 disabled:shadow-none"
          >
            Start Workout
          </Button>
        </div>
      </div>
    </div>
  )
}
