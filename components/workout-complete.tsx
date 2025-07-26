"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Clock, Target, Zap } from "lucide-react"

interface WorkoutCompleteProps {
  exercises: string[]
  sets: number
  totalTime: number
  onStartNew: () => void
}

export default function WorkoutComplete({ exercises, sets, totalTime, onStartNew }: WorkoutCompleteProps) {
  const completeSoundRef = useRef<{ play: () => void } | null>(null)

  useEffect(() => {
    // Create completion sound and play it when component mounts
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    
    const createCompletionSound = () => {
      const frequencies = [523.25, 659.25, 783.99] // C, E, G major chord
      frequencies.forEach((freq, i) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.setValueAtTime(freq, audioContext.currentTime)
          oscillator.type = "sine"
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01)
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.8)
        }, i * 100)
      })
    }

    // Play the completion sound immediately when the component loads
    createCompletionSound()

    return () => {
      if (audioContext.state !== "closed") {
        audioContext.close()
      }
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl bg-slate-800/50 border-purple-500/30">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Workout Complete!</CardTitle>
          <p className="text-lg text-slate-300">Great job finishing your training session</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <Clock className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-white">{formatTime(totalTime)}</div>
              <div className="text-sm text-slate-300">Total Time</div>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <Target className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-white">{exercises.length}</div>
              <div className="text-sm text-slate-300">Exercises</div>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <Zap className="h-6 w-6 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-white">{sets}</div>
              <div className="text-sm text-slate-300">Sets</div>
            </div>
          </div>

          {/* Exercises Completed */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Exercises Completed</h3>
            <div className="flex flex-wrap gap-2">
              {exercises.map((exercise, index) => (
                <Badge key={index} className="text-sm bg-purple-600 text-white hover:bg-purple-600">
                  {exercise}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center pt-4">
            <Button
              onClick={onStartNew}
              size="lg"
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white"
            >
              Start New Workout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
