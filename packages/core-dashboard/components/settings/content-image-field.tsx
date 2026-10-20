"use client"

import { useRef, useState } from "react"
import { Loader2, ImageIcon, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import { uploadContentImage } from "@core/lib/api/content-images"

interface ContentImageFieldProps {
  label: string
  hint?: string
  value: string | null
  onChange: (url: string | null) => void
  className?: string
}

export function ContentImageField({ label, hint, value, onChange, className }: ContentImageFieldProps) {
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Zgjidh një imazh (JPEG, PNG, WEBP)")
      return
    }
    setLoading(true)
    try {
      const { url } = await uploadContentImage(file)
      onChange(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ngarkimit të imazhit")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors max-w-xs",
            "border-border hover:border-accent/60"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null) }}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-xs text-center text-muted-foreground">
            {loading ? "Duke ngarkuar..." : "Kliko ose tërhiq një imazh"}
          </p>
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
