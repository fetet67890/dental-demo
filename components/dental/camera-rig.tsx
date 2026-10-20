"use client"

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const DEFAULT_TARGET: [number, number, number] = [0, 0, 0.2]
export const DEFAULT_CAMERA_POS: [number, number, number] = [0, 1.6, 9]
const FOCUS_DISTANCE = 1.6
const SETTLE_EPSILON = 0.01

interface CameraRigProps {
  // null/undefined = animate back to the default wide view
  focusPoint: [number, number, number] | null
  controlsRef: React.RefObject<{ target: THREE.Vector3; update: () => void } | null>
  // bumped by the parent every time the user manually drags/zooms/pans, so
  // an in-progress auto-animation yields immediately instead of fighting them
  interactionToken: number
  // bumped by the parent's "reset view" button. Needed because clicking
  // reset when focusPoint is *already* null wouldn't otherwise change
  // anything React can see, so the animation-start effect would never re-fire.
  resetToken: number
}

// Smoothly animates the camera + orbit target toward a tooth's position (or
// back to the default wide view) — but ONLY while a transition is actually
// in progress, disengaging once the camera reaches the goal or the instant
// the user manually interacts (otherwise it fights OrbitControls forever).
export function CameraRig({ focusPoint, controlsRef, interactionToken, resetToken }: CameraRigProps) {
  const { camera } = useThree()
  const targetGoal = useRef(new THREE.Vector3(...DEFAULT_TARGET))
  const camGoal = useRef(new THREE.Vector3(...DEFAULT_CAMERA_POS))
  const animating = useRef(false)

  useEffect(() => {
    const target = focusPoint ? new THREE.Vector3(...focusPoint) : new THREE.Vector3(...DEFAULT_TARGET)
    targetGoal.current.copy(target)

    if (focusPoint) {
      // Approach from roughly the same direction the camera is already
      // facing, just much closer, so the transition doesn't spin wildly.
      const currentTarget = controlsRef.current?.target ?? new THREE.Vector3(...DEFAULT_TARGET)
      const dir = camera.position.clone().sub(currentTarget)
      if (dir.lengthSq() < 1e-6) dir.set(0, 0.3, 1)
      dir.normalize()
      camGoal.current.copy(target).addScaledVector(dir, FOCUS_DISTANCE)
    } else {
      camGoal.current.set(...DEFAULT_CAMERA_POS)
    }
    animating.current = true
  }, [focusPoint, resetToken, camera, controlsRef])

  // Any manual interaction cancels whatever auto-animation was in progress.
  useEffect(() => {
    animating.current = false
  }, [interactionToken])

  useFrame(() => {
    if (!animating.current || !controlsRef.current) return
    controlsRef.current.target.lerp(targetGoal.current, 0.08)
    camera.position.lerp(camGoal.current, 0.08)
    controlsRef.current.update()

    const settled = controlsRef.current.target.distanceTo(targetGoal.current) < SETTLE_EPSILON &&
      camera.position.distanceTo(camGoal.current) < SETTLE_EPSILON
    if (settled) animating.current = false
  })

  return null
}
