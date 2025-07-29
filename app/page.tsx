"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { buildEquipmentSelectionUrl } from "@/lib/url-params"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
  const router = useRouter()
  const [showDevOptions, setShowDevOptions] = useState(false)

  useEffect(() => {
    // Show dev options briefly, then redirect
    const timer = setTimeout(() => {
      if (!showDevOptions) {
        router.replace(buildEquipmentSelectionUrl({}))
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [router, showDevOptions])

  // Show loading state with dev options
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide">Valkyrie Training</h1>
        
        {!showDevOptions ? (
          <div className="space-y-4">
            <p className="text-md text-slate-300 font-light">Loading...</p>
            <Button
              variant="ghost" 
              onClick={() => setShowDevOptions(true)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Developer Options
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-md text-slate-300 font-light">Choose an option:</p>
            <div className="flex flex-col gap-3">
              <Link href="/equipment-selection">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  Start Workout
                </Button>
              </Link>
              <Link href="/dev/graph-visualizer">
                <Button variant="outline" className="w-full border-slate-500 text-slate-300 hover:bg-slate-800/50">
                  Exercise Graph Visualizer (Demo)
                </Button>
              </Link>
              <Link href="/dev/difficulty-selector">
                <Button variant="outline" className="w-full border-slate-500 text-slate-300 hover:bg-slate-800/50">
                  Enhanced Difficulty Selector (Demo)
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
