import { useRef, useState, useCallback, useEffect } from 'react'

// Minimal ambient typings — the Web Speech API has no official TS lib entry.
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultLike[] & { length: number }
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | null
}

// Browser-native dictation (no external account/API key) — supported on
// Chrome/Edge/most Chromium browsers. Gracefully reports isSupported=false
// elsewhere (notably Firefox) so callers can hide the mic button.
export function useSpeechToText(onFinalChunk: (text: string) => void, lang = 'sq-AL') {
  const [isListening, setIsListening] = useState(false)
  const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalChunkRef = useRef(onFinalChunk)
  onFinalChunkRef.current = onFinalChunk

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) onFinalChunkRef.current(result[0].transcript)
      }
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [lang])

  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  return { isSupported, isListening, start, stop }
}
