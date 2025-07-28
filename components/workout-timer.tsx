"use client"

import { useMemo } from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import type { Exercise } from "@/types/exercise"
import { Play, Pause, SkipForward, Home, Volume2, VolumeX } from "lucide-react"
import WorkoutSequenceVisualizer from "./workout-sequence-visualizer"

type WorkoutStyle = "hiit" | "tabata"
type WorkoutPhase = "work" | "rest" | "setRest"

interface WorkoutTimerProps {
  exercises: Exercise[]
  sets: number
  workoutStyle: WorkoutStyle
  workTime: number
  restTime: number
  setRestTime: number
  onWorkoutComplete: (totalTime: number) => void
  onBackToHome: () => void
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

export default function WorkoutTimer({
  exercises,
  sets,
  workoutStyle,
  workTime,
  restTime,
  setRestTime,
  onWorkoutComplete,
  onBackToHome,
}: WorkoutTimerProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [phase, setPhase] = useState<WorkoutPhase>("work")
  const [timeRemaining, setTimeRemaining] = useState(workTime)
  const [isActive, setIsActive] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(0.5) // Volume from 0.0 to 1.0
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0)

  const tickSoundRef = useRef<HTMLAudioElement | null>(null)
  const dingSoundRef = useRef<HTMLAudioElement | null>(null)
  const halfwaySoundRef = useRef<HTMLAudioElement | null>(null)

  const currentExerciseData = exercises[currentExerciseIndex]

  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    const createSound = (freq: number | number[], duration: number, baseVol: number) => {
      return () => {
        const frequencies = Array.isArray(freq) ? freq : [freq]
        frequencies.forEach((f, i) => {
          setTimeout(() => {
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            oscillator.frequency.setValueAtTime(f, audioContext.currentTime)
            oscillator.type = "sine"
            const adjustedVolume = baseVol * volume
            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            gainNode.gain.linearRampToValueAtTime(adjustedVolume, audioContext.currentTime + 0.01)
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + duration)
          }, i * 100)
        })
      }
    }

    tickSoundRef.current = { play: createSound(800, 0.1, 0.1) } as any
    halfwaySoundRef.current = { play: createSound(440, 0.1, 0.1) } as any
    dingSoundRef.current = { play: createSound([800, 1000], 0.3, 0.2) } as any

    return () => {
      if (audioContext.state !== "closed") {
        audioContext.close()
      }
    }
  }, [volume])

  const nextPhase = useCallback(() => {
    if (isSoundEnabled && dingSoundRef.current) {
      dingSoundRef.current.play()
    }

    const isLastSet = currentSet === sets
    const isLastExercise = currentExerciseIndex === exercises.length - 1

    // End of workout check
    if (
      phase === "setRest" &&
      ((workoutStyle === "hiit" && isLastSet) || (workoutStyle === "tabata" && isLastExercise))
    ) {
      setIsActive(false)
      // Calculate final time based on elapsed time, as it's the most accurate
      onWorkoutComplete(totalTimeElapsed)
      return
    }

    if (phase === "work") {
      setPhase("rest")
      setTimeRemaining(restTime)
      return
    }

    if (phase === "rest") {
      const endOfHiitBlock = workoutStyle === "hiit" && isLastExercise
      const endOfTabataBlock = workoutStyle === "tabata" && isLastSet

      if ((endOfHiitBlock || endOfTabataBlock) && setRestTime > 0) {
        setPhase("setRest")
        setTimeRemaining(setRestTime)
      } else {
        // Not the end of a major block, so advance the secondary counter and start work
        if (workoutStyle === "hiit") {
          setCurrentExerciseIndex((prev) => prev + 1)
        } else {
          setCurrentSet((prev) => prev + 1)
        }
        setPhase("work")
        setTimeRemaining(workTime)
      }
      return
    }

    if (phase === "setRest") {
      // After a set rest, advance the primary counter and reset the secondary one
      if (workoutStyle === "hiit") {
        setCurrentSet((prev) => prev + 1)
        setCurrentExerciseIndex(0)
      } else {
        setCurrentExerciseIndex((prev) => prev + 1)
        setCurrentSet(1)
      }
      setPhase("work")
      setTimeRemaining(workTime)
      return
    }
  }, [
    phase,
    currentExerciseIndex,
    currentSet,
    exercises.length,
    sets,
    workoutStyle,
    isSoundEnabled,
    onWorkoutComplete,
    restTime,
    setRestTime,
    workTime,
    totalTimeElapsed,
  ])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev > 1) {
            const newTime = prev - 1
            let currentPhaseDuration = workTime
            if (phase === "rest") currentPhaseDuration = restTime
            if (phase === "setRest") currentPhaseDuration = setRestTime
            const halfwayPoint = Math.floor(currentPhaseDuration / 2)

            if (newTime === halfwayPoint && isSoundEnabled && halfwaySoundRef.current) {
              halfwaySoundRef.current.play()
            }
            if (newTime <= 10 && isSoundEnabled && tickSoundRef.current) {
              tickSoundRef.current.play()
            }
            return newTime
          } else {
            // Time is up, trigger the next phase
            // Use a function to ensure we are using the latest state in nextPhase
            // This avoids stale state issues.
            setTimeout(nextPhase, 0)
            return 0 // Reset timer for now, nextPhase will set the correct new time
          }
        })
        setTotalTimeElapsed((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, phase, nextPhase])

  const toggleTimer = () => setIsActive(!isActive)
  const skipPhase = () => {
    const timeSkipped = timeRemaining
    setTotalTimeElapsed((prev) => prev + timeSkipped)
    nextPhase()
  }
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getUpcomingExercises = () => {
    // This function would need to be updated to be aware of the new detailed sequence,
    // but for now we'll keep its simpler logic.
    const fullWorkoutPlan: { exercise: Exercise; set: number }[] = []
    if (workoutStyle === "tabata") {
      for (let i = 0; i < exercises.length; i++) {
        for (let j = 1; j <= sets; j++) {
          fullWorkoutPlan.push({ exercise: exercises[i], set: j })
        }
      }
    } else {
      for (let j = 1; j <= sets; j++) {
        for (let i = 0; i < exercises.length; i++) {
          fullWorkoutPlan.push({ exercise: exercises[i], set: j })
        }
      }
    }

    let currentIndex = -1
    if (workoutStyle === "tabata") {
      currentIndex = currentExerciseIndex * sets + (currentSet - 1)
    } else {
      currentIndex = (currentSet - 1) * exercises.length + currentExerciseIndex
    }

    const startIndex = currentIndex + 1
    return fullWorkoutPlan.slice(startIndex, startIndex + 3)
  }

  const totalWorkoutTimeValue = useMemo(() => {
    const numExercises = exercises.length
    if (numExercises === 0 || sets === 0) return 0
    if (workoutStyle === "hiit") {
      const timePerSet = numExercises * (workTime + restTime) + setRestTime
      return sets * timePerSet
    } else {
      const timePerExercise = sets * (workTime + restTime) + setRestTime
      return numExercises * timePerExercise
    }
  }, [exercises.length, sets, workTime, restTime, setRestTime, workoutStyle])

  const progressPercentage = totalWorkoutTimeValue > 0 ? (totalTimeElapsed / totalWorkoutTimeValue) * 100 : 0

  let completedIntervals = 0
  if (workoutStyle === "tabata") {
    completedIntervals = currentExerciseIndex * sets + (currentSet - 1)
  } else {
    completedIntervals = (currentSet - 1) * exercises.length + currentExerciseIndex
  }

  const getPhaseInfo = () => {
    switch (phase) {
      case "work":
        return { text: "WORK", color: "bg-green-600" }
      case "rest":
        return { text: "REST", color: "bg-blue-600" }
      case "setRest":
        return { text: "SET REST", color: "bg-purple-600" }
    }
  }
  const phaseInfo = getPhaseInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBackToHome}
            className="text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            <Home className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="text-xs text-slate-400">
              Set {currentSet}/{sets}
            </div>
            <div className="text-sm font-mono text-white">
              Ex {currentExerciseIndex + 1}/{exercises.length}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className="text-slate-300 hover:text-white hover:bg-slate-800/50"
            >
              {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            {isSoundEnabled && (
              <div className="w-16">
                <Slider
                  value={[volume * 100]}
                  onValueChange={(value) => setVolume(value[0] / 100)}
                  max={100}
                  min={0}
                  step={10}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercentage} className="h-1 bg-slate-800" />

        {/* Sequence Visualizer */}
        <div className="pt-2">
          <WorkoutSequenceVisualizer
            workoutExercises={exercises}
            sets={sets}
            style={workoutStyle}
            colors={colorPalette}
            completedIntervals={completedIntervals}
            workTime={workTime}
            restTime={restTime}
            setRestTime={setRestTime}
            enableAutoScroll={true}
            currentPhase={phase}
            currentExerciseIndex={currentExerciseIndex}
            currentSet={currentSet}
          />
        </div>

        {/* Main Timer Card */}
        <Card className="bg-slate-800/30 border-slate-700/50 text-white">
          <CardContent className="p-6 text-center space-y-4">
            <Badge className={`text-base px-4 py-1 rounded-full ${phaseInfo.color} hover:${phaseInfo.color}`}>
              {phaseInfo.text}
            </Badge>
            <div
              className={`text-7xl md:text-8xl font-light font-mono transition-colors duration-300 ${
                timeRemaining <= 10 && timeRemaining > 0 ? "text-red-400 animate-pulse" : ""
              }`}
            >
              {formatTime(timeRemaining)}
            </div>
            <h2 className="text-xl md:text-2xl font-light">{currentExerciseData?.name}</h2>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button 
            onClick={toggleTimer} 
            size="lg" 
            className="w-32 bg-purple-600 hover:bg-purple-700 rounded-full"
            data-testid="play-pause-button"
          >
            {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button
            onClick={skipPhase}
            variant="outline"
            size="lg"
            className="w-32 border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-full bg-transparent"
            data-testid="skip-button"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
        </div>

        {/* Cues and Upcoming */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-base font-light text-white text-center">Form Cues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentExerciseData?.cues.slice(0, 3).map((cue, index) => (
                <div key={index} className="text-sm text-slate-300 bg-slate-700/30 rounded-md p-3">
                  • {cue}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-base font-light text-white text-center">Up Next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {getUpcomingExercises()
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={index}
                    className="text-sm text-slate-300 bg-slate-700/30 rounded-md p-3 flex justify-between"
                  >
                    <span>{item.exercise.name}</span>
                    <span className="text-slate-400">Set {item.set}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
