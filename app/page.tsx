"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { buildEquipmentSelectionUrl } from "@/lib/url-params"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to equipment selection page
    router.replace(buildEquipmentSelectionUrl({}))
  }, [router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-light text-white tracking-wide">Valkyrie Training</h1>
        <p className="text-md text-slate-300 font-light">Loading...</p>
      </div>
    </div>
  )
}
