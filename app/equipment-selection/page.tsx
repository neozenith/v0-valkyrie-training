"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, Zap, Armchair, Circle, Minus, TrendingUp, Grip, AlignHorizontalDistributeStart } from "lucide-react"
import exerciseData from "@/data/exercises.json"
import type { Exercise } from "@/types/exercise"
import { parseEquipmentSelectionParams, buildWorkoutSetupUrl } from "@/lib/url-params"

function EquipmentSelectionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse URL parameters and initialize state
  const urlParams = parseEquipmentSelectionParams(searchParams)
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(urlParams.equipment || ["bodyweight"])

  // Update URL when equipment selection changes
  useEffect(() => {
    const newUrl = new URL(window.location.href)
    if (selectedEquipment.length > 0) {
      newUrl.searchParams.set('equipment', selectedEquipment.join(','))
    } else {
      newUrl.searchParams.delete('equipment')
    }
    
    // Only update URL if it's different to avoid unnecessary history entries
    if (newUrl.search !== window.location.search) {
      router.replace(newUrl.pathname + newUrl.search, { scroll: false })
    }
  }, [selectedEquipment, router])

  const equipmentOptions = useMemo(() => {
    const allExercises: Exercise[] = exerciseData.exercises

    const options = [
      {
        id: "bodyweight",
        name: "Bodyweight",
        description: "No equipment",
        icon: <Zap className="h-5 w-5" />,
        disabled: true,
      },
      {
        id: "dumbbells",
        name: "Dumbbells",
        description: "Paired weights",
        icon: <Dumbbell className="h-5 w-5" />,
        disabled: false,
      },
      {
        id: "kettlebells",
        name: "Kettlebells",
        description: "Dynamic weights",
        icon: <Circle className="h-5 w-5" />,
        disabled: false,
      },
      {
        id: "barbell",
        name: "Barbell",
        description: "Heavy lifting",
        icon: <Minus className="h-5 w-5" />,
        disabled: false,
      },
      {
        id: "pull-up-bar",
        name: "Pull-up Bar",
        description: "Hanging exercises",
        icon: <Grip className="h-5 w-5" />,
        disabled: false,
      },
      {
        id: "parallettes",
        name: "Parallettes",
        description: "Calisthenics bars",
        icon: <AlignHorizontalDistributeStart className="h-5 w-5" />,
        disabled: false,
      },
      {
        id: "bench",
        name: "Bench",
        description: "Elevated surface",
        icon: <Armchair className="h-5 w-5" />,
        disabled: false,
      },
      {
        id: "resistance-bands",
        name: "Resistance Bands",
        description: "Variable tension",
        icon: <Zap className="h-5 w-5" />,
        disabled: false,
      },
      {
        id: "landmine",
        name: "Landmine",
        description: "Angled barbell",
        icon: <TrendingUp className="h-5 w-5" />,
        disabled: false,
      },
    ]

    return options.map((option) => {
      const count = allExercises.filter((ex) => ex.equipment.includes(option.id)).length
      return { ...option, exerciseCount: count }
    })
  }, [])

  const handleEquipmentChange = (equipmentId: string, checked: boolean) => {
    if (equipmentId === "bodyweight") return

    setSelectedEquipment((prev) => {
      if (checked) {
        return [...prev, equipmentId]
      } else {
        return prev.filter((id) => id !== equipmentId)
      }
    })
  }

  const handleContinue = () => {
    // Navigate to workout setup with selected equipment
    const workoutSetupUrl = buildWorkoutSetupUrl({
      equipment: selectedEquipment
    })
    router.push(workoutSetupUrl)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide">Valkyrie Training</h1>
          <p className="text-md text-slate-300 font-light max-w-md mx-auto">
            Welcome to Valkyrie Training. Empowering women for over 500 years.
          </p>
          <div>
            <p className="text-sm text-slate-400">
              <span className="font-semibold">Coaches:</span> Cassian from Illyria & Nesta Archeron
            </p>
          </div>
          <p className="text-md text-purple-300 font-light pt-4">Select your available equipment below to begin.</p>
        </div>

        {/* Equipment Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {equipmentOptions.map((equipment) => (
            <div
              key={equipment.id}
              className={`group cursor-pointer transition-all duration-300 ${
                selectedEquipment.includes(equipment.id) ? "transform scale-105" : "hover:transform hover:scale-102"
              }`}
              onClick={() =>
                !equipment.disabled && handleEquipmentChange(equipment.id, !selectedEquipment.includes(equipment.id))
              }
            >
              <Card
                className={`h-full border-2 transition-all duration-300 flex flex-col ${
                  selectedEquipment.includes(equipment.id)
                    ? "border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20"
                    : "border-slate-600 bg-slate-800/30 hover:border-slate-500"
                }`}
              >
                <CardContent className="p-4 text-center space-y-3 flex-grow flex flex-col justify-between">
                  <div>
                    <div
                      className={`mx-auto transition-colors duration-300 ${
                        selectedEquipment.includes(equipment.id) ? "text-purple-400" : "text-slate-400"
                      }`}
                    >
                      {equipment.icon}
                    </div>
                    <div className="space-y-1 mt-3">
                      <h3 className="text-base font-medium text-white">{equipment.name}</h3>
                      <p className="text-xs text-slate-400">{equipment.description}</p>
                    </div>
                  </div>
                  <div className="pt-2 space-y-2">
                    <Badge variant="secondary" className="text-xs font-mono">
                      {equipment.exerciseCount} exercises
                    </Badge>
                    <div className="pt-1">
                      <Checkbox
                        checked={selectedEquipment.includes(equipment.id)}
                        disabled={equipment.disabled}
                        className="border-slate-400 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className="text-center space-y-3">
          <p className="text-sm text-slate-400">
            {selectedEquipment.length} item{selectedEquipment.length !== 1 ? "s" : ""} selected
          </p>
          <Button
            onClick={handleContinue}
            size="lg"
            className="px-12 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25"
          >
            Build My Workout
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function EquipmentSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="text-white text-center">
          <p>Loading...</p>
        </div>
      </div>
    }>
      <EquipmentSelectionContent />
    </Suspense>
  )
}