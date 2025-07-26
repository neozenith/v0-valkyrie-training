"use client"

import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface NumberControlProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (newValue: number) => void
}

export default function NumberControl({ label, value, min, max, step = 1, onChange }: NumberControlProps) {
  const handleDecrement = () => {
    // Ensure the new value doesn't go below the minimum
    const newValue = Math.max(min, value - step)
    onChange(newValue)
  }

  const handleIncrement = () => {
    // Ensure the new value doesn't exceed the maximum
    const newValue = Math.min(max, value + step)
    onChange(newValue)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-light text-white text-center">{label}</h3>
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={value <= min}
          className="rounded-full border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white disabled:opacity-30 bg-transparent"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-2xl font-mono text-white w-12 text-center">{value}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={value >= max}
          className="rounded-full border-slate-500 text-slate-300 hover:bg-slate-800/50 hover:text-white disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
