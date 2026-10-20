"use client"

import { Mic, MicOff } from 'lucide-react'
import { cn } from '@core/lib/utils'
import { useSpeechToText } from '@core/hooks/use-speech-to-text'

interface DictateButtonProps {
  onTranscript: (text: string) => void
  className?: string
  lang?: string
}

// A small mic toggle that appends dictated speech to whatever the caller does
// with onTranscript (typically appending to a textarea's value). Renders
// nothing if the browser doesn't support the Web Speech API (e.g. Firefox).
export function DictateButton({ onTranscript, className, lang }: DictateButtonProps) {
  const { isSupported, isListening, start, stop } = useSpeechToText(onTranscript, lang)

  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={() => (isListening ? stop() : start())}
      title={isListening ? 'Ndalo diktimin' : 'Diktoni me zë'}
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors shrink-0',
        isListening
          ? 'bg-destructive text-destructive-foreground animate-pulse'
          : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
        className
      )}
    >
      {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  )
}
