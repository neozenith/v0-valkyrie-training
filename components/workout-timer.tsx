"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { Exercise } from "@/types/exercise"
import { Play, Pause, SkipForward, Home, Volume2, VolumeX } from "lucide-react"
import WorkoutSequenceVisualizer from "./workout-sequence-visualizer"

type WorkoutStyle = "hiit" | "tabata"

interface WorkoutTimerProps {
  exercises: Exercise[]
  sets: number
  workoutStyle: WorkoutStyle
  onWorkoutComplete: () => void
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
  onWorkoutComplete,
  onBackToHome,
}: WorkoutTimerProps) {
  const workTime = 40
  const restTime = 20

  const [currentExercise, setCurrentExercise] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [isResting, setIsResting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(workTime)
  const [isActive, setIsActive] = useState(false)
  const [isSoundEnabled, setIsSoundEnabled] = useState(true)

  const tickSoundRef = useRef<HTMLAudioElement | null>(null)
  const dingSoundRef = useRef<HTMLAudioElement | null>(null)
  const completeSoundRef = useRef<HTMLAudioElement | null>(null)
  const halfwaySoundRef = useRef<HTMLAudioElement | null>(null)

  const currentExerciseData = exercises[currentExercise]

  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    const createSound = (freq: number | number[], duration: number, vol: number) => {
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
            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            gainNode.gain.linearRampToValueAtTime(vol, audioContext.currentTime + 0.01)
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
    completeSoundRef.current = { play: createSound([523.25, 659.25, 783.99], 0.8, 0.15) } as any

    return () => {
      if (audioContext.state !== "closed") {
        audioContext.close()
      }
    }
  }, [])

  const nextPhase = useCallback(() => {
    if (isSoundEnabled && dingSoundRef.current) {
      dingSoundRef.current.play()
    }

    if (isResting) {
      if (workoutStyle === "tabata") {
        if (currentSet < sets) {
          setCurrentSet((prev) => prev + 1)
        } else if (currentExercise < exercises.length - 1) {
          setCurrentExercise((prev) => prev + 1)
          setCurrentSet(1)
        } else {
          setIsActive(false)
          if (isSoundEnabled && completeSoundRef.current) completeSoundRef.current.play()
          onWorkoutComplete()
          return
        }
      } else {
        if (currentExercise < exercises.length - 1) {
          setCurrentExercise((prev) => prev + 1)
        } else if (currentSet < sets) {
          setCurrentSet((prev) => prev + 1)
          setCurrentExercise(0)
        } else {
          setIsActive(false)
          if (isSoundEnabled && completeSoundRef.current) completeSoundRef.current.play()
          onWorkoutComplete()
          return
        }
      }
      setIsResting(false)
      setTimeRemaining(workTime)
    } else {
      setIsResting(true)
      setTimeRemaining(restTime)
    }
  }, [isResting, currentExercise, currentSet, exercises.length, sets, workoutStyle, isSoundEnabled, onWorkoutComplete])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive && timeRemaining > 0) {
      const currentPhaseDuration = isResting ? restTime : workTime
      const halfwayPoint = Math.floor(currentPhaseDuration / 2)

      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1
          if (newTime === halfwayPoint && isSoundEnabled && halfwaySoundRef.current) {
            halfwaySoundRef.current.play()
          }
          if (newTime <= 10 && newTime > 0 && isSoundEnabled && tickSoundRef.current) {
            tickSoundRef.current.play()
          }
          return newTime
        })
      }, 1000)
    } else if (isActive && timeRemaining === 0) {
      nextPhase()
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeRemaining, nextPhase, isSoundEnabled, isResting])

  const toggleTimer = () => setIsActive(!isActive)
  const skipPhase = () => nextPhase()
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getUpcomingExercises = () => {
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
      currentIndex = currentExercise * sets + (currentSet - 1)
    } else {
      currentIndex = (currentSet - 1) * exercises.length + currentExercise
    }

    const startIndex = currentIndex + 1
    return fullWorkoutPlan.slice(startIndex, startIndex + 3)
  }

  const totalWorkoutTime = exercises.length * sets * (workTime + restTime) - restTime
  const getTotalTimeElapsed = () => {
    let intervalsDone
    if (workoutStyle === "tabata") {
      intervalsDone = currentExercise * sets + (currentSet - 1)
    } else {
      intervalsDone = (currentSet - 1) * exercises.length + currentExercise
    }

    const timeElapsedInDoneIntervals = intervalsDone * (workTime + restTime)
    const timeElapsedInCurrentInterval = isResting ? restTime - timeRemaining : workTime - timeRemaining
    return timeElapsedInDoneIntervals + timeElapsedInCurrentInterval
  }

  const progressPercentage = (getTotalTimeElapsed() / totalWorkoutTime) * 100

  let completedIntervals = 0
  if (workoutStyle === "tabata") {
    completedIntervals = currentExercise * sets + (currentSet - 1)
  } else {
    completedIntervals = (currentSet - 1) * exercises.length + currentExercise
  }

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
              Ex {currentExercise + 1}/{exercises.length}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="text-slate-300 hover:text-white hover:bg-slate-800/50"
          >
            {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercentage} className="h-1 bg-slate-800" />

        {/* Sequence Visualizer */}
        <div className="pt-2">
          <WorkoutSequenceVisualizer
            numExercises={exercises.length}
            sets={sets}
            style={workoutStyle}
            colors={colorPalette}
            completedIntervals={completedIntervals}
          />
        </div>

        {/* Main Timer Card */}
        <Card className="bg-slate-800/30 border-slate-700/50 text-white">
          <CardContent className="p-6 text-center space-y-4">
            <Badge
              className={`text-base px-4 py-1 rounded-full ${
                isResting ? "bg-blue-600 hover:bg-blue-600" : "bg-green-600 hover:bg-green-600"
              }`}
            >
              {isResting ? "REST" : "WORK"}
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
          <Button onClick={toggleTimer} size="lg" className="w-32 bg-purple-600 hover:bg-purple-700 rounded-full">
            {isActive ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button
            onClick={skipPhase}
            variant="outline"
            size="lg"
            className="w-32 border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-full bg-transparent"
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
