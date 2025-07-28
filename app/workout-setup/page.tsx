"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Exercise } from "@/types/exercise"
import { ChevronDown, ChevronUp, RotateCcw, ArrowLeft } from "lucide-react"
import NumberControl from "@/components/number-control"
import WorkoutSequenceVisualizer from "@/components/workout-sequence-visualizer"
import {
  parseWorkoutSetupParams,
  buildWorkoutSetupUrl,
  buildEquipmentSelectionUrl,
  buildWorkoutTimerUrl,
  DEFAULT_VALUES
} from "@/lib/url-params"
import {
  getExercisesForEquipment,
  exerciseIdsToExercises,
  exercisesToExerciseIds,
  generateRandomExercises,
  validateExerciseIds,
  getExerciseVariantName,
  processExercisesForWorkout,
  ExerciseWithVariant
} from "@/lib/exercise-utils"

type WorkoutStyle = "hiit" | "tabata"

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

function WorkoutSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse URL parameters
  const params = parseWorkoutSetupParams(searchParams)
  
  // Initialize state from URL parameters
  const [selectedEquipment] = useState<string[]>(params.equipment || DEFAULT_VALUES.equipment)
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [workoutExercises, setWorkoutExercises] = useState<ExerciseWithVariant[]>([])
  const [selectedSets, setSelectedSets] = useState(params.sets || DEFAULT_VALUES.sets)
  const [selectedExercises, setSelectedExercises] = useState(params.exercises || DEFAULT_VALUES.exercises)
  const [workoutStyle, setWorkoutStyle] = useState<WorkoutStyle>(params.style || DEFAULT_VALUES.style)
  const [expandedExercise, setExpandedExercise] = useState<number | null>(null)
  const [workTime, setWorkTime] = useState(params.workTime || DEFAULT_VALUES.workTime)
  const [restTime, setRestTime] = useState(params.restTime || DEFAULT_VALUES.restTime)
  const [setRestTimeValue, setSetRestTimeValue] = useState(params.setRestTime || DEFAULT_VALUES.setRestTime)

  // Redirect to equipment selection if no equipment is provided
  useEffect(() => {
    if (!selectedEquipment || selectedEquipment.length === 0) {
      router.push(buildEquipmentSelectionUrl({}))
      return
    }
  }, [selectedEquipment, router])

  // Update available exercises when equipment changes
  useEffect(() => {
    if (selectedEquipment && selectedEquipment.length > 0) {
      const filtered = getExercisesForEquipment(selectedEquipment)
      setAvailableExercises(filtered)
    }
  }, [selectedEquipment])

  // Initialize workout exercises from URL parameters or generate new ones
  useEffect(() => {
    if (availableExercises.length === 0) return

    // If we have valid exercise IDs from URL AND the count matches current selectedExercises
    if (params.exerciseIds && params.exerciseIds.length > 0 && params.exerciseIds.length === selectedExercises) {
      const validExerciseIds = validateExerciseIds(params.exerciseIds, selectedEquipment)
      const exercisesFromUrl = exerciseIdsToExercises(validExerciseIds)
      
      if (exercisesFromUrl.length === selectedExercises) {
        setWorkoutExercises(exercisesFromUrl)
        return
      }
    }

    // Generate random exercises if none specified, invalid ones, or count mismatch
    regenerateWorkout()
  }, [availableExercises, selectedExercises]) // Don't include params in dependency to avoid loops

  // Update URL when parameters change
  const updateUrl = (newParams: Partial<typeof params>) => {
    const updatedParams = {
      ...params,
      equipment: selectedEquipment,
      sets: selectedSets,
      exercises: selectedExercises,
      style: workoutStyle,
      workTime: workTime,
      restTime: restTime,
      setRestTime: setRestTimeValue,
      ...newParams
    }

    const newUrl = buildWorkoutSetupUrl(updatedParams)
    router.replace(newUrl, { scroll: false })
  }

  // Update URL when configuration changes
  useEffect(() => {
    if (workoutExercises.length > 0) {
      updateUrl({
        exerciseIds: exercisesToExerciseIds(workoutExercises)
      })
    }
  }, [workoutExercises])

  useEffect(() => {
    updateUrl({})
  }, [selectedSets, selectedExercises, workoutStyle, workTime, restTime, setRestTimeValue])

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
    
    const newExercises = generateRandomExercises(availableExercises, selectedExercises)
    setWorkoutExercises(newExercises)
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
    // Navigate to workout timer with all parameters
    const timerUrl = buildWorkoutTimerUrl({
      sets: selectedSets,
      exercises: workoutExercises.length,
      style: workoutStyle,
      workTime: workTime,
      restTime: restTime,
      setRestTime: setRestTimeValue,
      exerciseIds: exercisesToExerciseIds(workoutExercises)
    })
    router.push(timerUrl)
  }

  const handleBack = () => {
    // Navigate back to equipment selection
    const equipmentUrl = buildEquipmentSelectionUrl({
      equipment: selectedEquipment
    })
    router.push(equipmentUrl)
  }

  const getVariantName = (exerciseVariant: ExerciseWithVariant) => {
    return getExerciseVariantName(exerciseVariant.exercise, exerciseVariant.selectedVariant)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
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
              <p className="text-3xl font-mono text-purple-300 mt-1" data-testid="total-workout-time">{formatTime(totalWorkoutTime)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sequence Visualizer */}
        <WorkoutSequenceVisualizer
          workoutExercises={processExercisesForWorkout(workoutExercises)}
          sets={selectedSets}
          style={workoutStyle}
          colors={colorPalette}
          completedIntervals={0}
          workTime={workTime}
          restTime={restTime}
          setRestTime={setRestTimeValue}
          enableAutoScroll={false}
        />

        {/* Exercise List */}
        <div className="space-y-4" data-testid="exercise-list-section">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-light text-white">Your Workout ({availableExercises.length} available)</h3>
            <Button
              variant="outline"
              onClick={regenerateWorkout}
              disabled={availableExercises.length === 0}
              className="border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white bg-transparent"
              data-testid="shuffle-exercises-button"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
          </div>

          {workoutExercises.length > 0 ? (
            <div className="space-y-3">
              {workoutExercises.map((exerciseVariant, index) => (
                <Card 
                  key={`${exerciseVariant.exercise.id}-${index}`} 
                  className="bg-slate-800/30 border-slate-700/50"
                  data-testid={`exercise-card-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold shadow-inner shadow-black/20 ${
                              colorPalette[index % colorPalette.length]
                            }`}
                            data-testid={`exercise-badge-${index}`}
                          >
                            {index + 1}
                          </Badge>
                          <div>
                            <h4 className="font-medium text-white" data-testid={`exercise-name-${index}`}>{getVariantName(exerciseVariant)}</h4>
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
                        data-testid={`exercise-difficulty-toggle-${index}`}
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
            data-testid="start-workout-button"
          >
            Start Workout
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-6 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Loading workout setup...</p>
        </div>
      </div>
    }>
      <WorkoutSetupContent />
    </Suspense>
  )
}