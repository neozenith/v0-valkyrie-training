"use client"

import { Button } from "@/components/ui/button"
import { Minus, Plus } from "lucide-react"

interface NumberControlProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (newValue: number) => void
}

export default function NumberControl({ label, value, min, max, onChange }: NumberControlProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1)
    }
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
