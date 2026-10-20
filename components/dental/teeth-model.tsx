"use client"

import { useEffect, useMemo, useState } from 'react'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { ToothConditionType } from '@/types/specialty'

// Ported from the standalone odontogram-3d-preview app, where this model and
// mapping were built/verified against the real downloaded GLTF asset before
// being carried over here. Includes 4 real wisdom teeth (18/28/48/38),
// manually duplicated from their neighboring molars and placed by hand in
// Blender, since the source "Teeth" model only ever sculpted 28. Gum
// coverage around these 4 was NOT extended (attempted both in Blender and as
// a code-side mound, neither gave a clean result) — accepted as-is, bare, no
// add-on shape around their base.
const MODEL_PATH = '/models/final-teeth-odontogram-design.glb'

// Real per-tooth mesh mapping. The original 28 node names were derived from
// the source model's own geometry bounding boxes, sorted by angular position
// around each jaw's arch center (a plain X-sort breaks down near the curve's
// turning points, since a curved arch isn't monotonic in a single axis). The
// 4 wisdom teeth are the manually duplicated objects — Blender names a
// duplicate "Box010.001" etc, but THREE's GLTFLoader strips `.`, `[`, `]`,
// `:`, `/` from every node name entirely (reserved characters for its
// animation-track path syntax), so the name actually available at runtime
// is "Box010001", not "Box010.001" — confirmed by reading
// PropertyBinding.sanitizeNodeName directly, not guessed.
// Source: "Teeth" by Poly by Google, via poly.pizza — CC-BY 3.0.
const TOOTH_NODE_TO_FDI: Record<string, number> = {
  Box010: 17, Box009: 16, Box008: 15, Box007: 14, Box005: 13, Box003: 12, Box002: 11,
  Box001: 21, Box004: 22, Box006: 23, Box011: 24, Box012: 25, Box013: 26, Box014: 27,
  Box028: 47, Box017: 46, Box018: 45, Box024: 44, Box022: 43, Box021: 42, Box020: 41,
  Box031: 31, Box019: 32, Box023: 33, Box029: 34, Box025: 35, Box016: 36, Box027: 37,
  Box010001: 18, Box014001: 28, Box028001: 48, Box027001: 38,
}
const GUM_NODES = ['Box015', 'Box030']
export const ALL_FDI: number[] = Object.values(TOOTH_NODE_TO_FDI)

export type NumberingSystem = 'fdi' | 'universal'

// Universal Numbering System (ADA/US convention): #1 = upper-right third
// molar, sweeping across the upper arch to #16 (upper-left third molar),
// then dropping to #17 (lower-left third molar) and back across to #32
// (lower-right third molar). Every tooth's real identity/condition data
// stays keyed by FDI internally — this is a display-only relabeling.
const FDI_TO_UNIVERSAL: Record<number, number> = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,
}

export function formatToothNumber(fdi: number, system: NumberingSystem): string {
  return system === 'universal' ? String(FDI_TO_UNIVERSAL[fdi] ?? fdi) : String(fdi)
}

// FDI notation: the last digit of the tooth number is its position within
// the quadrant (1-2 incisor, 3 canine, 4-5 premolar, 6-8 molar). This
// classification is unaffected by which system is chosen for display.
export function getToothKindLabel(fdi: number): string {
  const pos = fdi % 10
  if (pos <= 2) return 'Dhëmb Prerës'
  if (pos === 3) return 'Syth (Kanin)'
  if (pos <= 5) return 'Premolar'
  return 'Molar'
}

// This export bakes a uniform per-object scale onto every node (from a
// manual "select all, scale by 0.00001" step in Blender, needed to make the
// source geometry's huge coordinates navigable) but no compensating
// translation, so the assembled model's centroid sits well away from the
// origin. This offsets it back near (0,0,0) — computed directly from the
// file's own accessor min/max, not eyeballed.
const RECENTER: [number, number, number] = [7.994364380836487, -5.589745134115219, -7.591415092349052]
const RECENTER_VECTOR = new THREE.Vector3(...RECENTER)

const GUM_COLOR = '#E8B4A0'
const GUM_ROUGHNESS = 0.85
const ENAMEL = '#F7F1E4'
const CERAMIC_CROWN = '#FBFAF6' // slightly brighter/whiter+glossier than natural enamel — the "too perfect" look of a real porcelain crown
const BRIDGE_TONE = '#EDEAE2'   // porcelain-fused-to-metal — a touch cooler/greyer than a pure ceramic crown
const METAL_POST = '#9CA3AF'    // titanium-grey implant post
const FILLING_METAL = '#B8BCC2' // amalgam-ish filling patch
const ROOT_CANAL_MARKER = '#F59E0B'

const STATUS_EMISSIVE: Record<string, string> = {
  selected: '#5B65DC',
  planned:  '#8B5CF6',
  treated:  '#22C55E',
}

// Position + rotation to stretch a Y-aligned cylinder so it connects two
// arbitrary points — used to draw the root-canal filling along each tooth's
// real gumline-to-occlusal axis instead of guessing a fixed orientation.
function axisTransform(a: [number, number, number], b: [number, number, number]) {
  const pa = new THREE.Vector3(...a)
  const pb = new THREE.Vector3(...b)
  const mid = pa.clone().add(pb).multiplyScalar(0.5)
  const dir = pb.clone().sub(pa)
  const length = dir.length()
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  return { position: mid.toArray() as [number, number, number], quaternion, length }
}

// Shared material properties for a tooth surface.
function toothMaterialProps(condition: ToothConditionType | undefined, status: string, isHovered: boolean) {
  const isRootCanal = condition === 'kanal_rrenjor'
  let baseColor = ENAMEL
  let roughness = 0.28
  let metalness = 0
  let clearcoat = 0.5
  if (condition === 'kurore') { baseColor = CERAMIC_CROWN; roughness = 0.12; clearcoat = 0.9 }
  if (condition === 'ure') { baseColor = BRIDGE_TONE; roughness = 0.2; metalness = 0.15; clearcoat = 0.7 }
  if (condition === 'implant') { baseColor = CERAMIC_CROWN; roughness = 0.15; clearcoat = 0.85 }

  const emissive = isHovered ? '#5B65DC' : (status !== 'normal' ? STATUS_EMISSIVE[status] : '#000000')
  const emissiveIntensity = isHovered ? 0.35 : (status !== 'normal' ? 0.22 : 0)

  return {
    color: baseColor, roughness, metalness, clearcoat, clearcoatRoughness: 0.15,
    emissive, emissiveIntensity,
    transparent: isRootCanal, opacity: isRootCanal ? 0.4 : 1, depthWrite: !isRootCanal,
  }
}

export type ToothPoints = Record<number, { occlusal: [number, number, number]; gumline: [number, number, number] }>

// Computes a tooth's occlusal (biting surface) and gumline attachment points
// directly from its real geometry bounding box + the node's own actual
// position/rotation/scale, instead of hardcoded coordinates — every tooth
// (including the 4 duplicated wisdom teeth) carries its own independent
// transform from Blender.
function computeAttachmentPoints(node: THREE.Mesh, isUpper: boolean): { occlusal: [number, number, number]; gumline: [number, number, number] } {
  const geometry = node.geometry
  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox!
  const cx = (bbox.min.x + bbox.max.x) / 2
  const cz = (bbox.min.z + bbox.max.z) / 2
  const toWorld = (local: THREE.Vector3) =>
    local.clone().multiply(node.scale).applyQuaternion(node.quaternion).add(node.position).add(RECENTER_VECTOR)
  const occlusal = toWorld(new THREE.Vector3(cx, isUpper ? bbox.min.y : bbox.max.y, cz))
  const gumline = toWorld(new THREE.Vector3(cx, isUpper ? bbox.max.y : bbox.min.y, cz))
  return {
    occlusal: occlusal.toArray() as [number, number, number],
    gumline: gumline.toArray() as [number, number, number],
  }
}

interface TeethModelProps {
  conditions: Partial<Record<number, ToothConditionType>>
  selectedTeeth: number[]
  treatedTeeth: number[]
  plannedTeeth: number[]
  onSelect: (tooth: number) => void
  showLabels?: boolean
  numberingSystem?: NumberingSystem
  onPointsReady?: (points: ToothPoints) => void
}

export function TeethModel({ conditions, selectedTeeth, treatedTeeth, plannedTeeth, onSelect, showLabels, numberingSystem = 'fdi', onPointsReady }: TeethModelProps) {
  const { nodes } = useGLTF(MODEL_PATH) as unknown as { nodes: Record<string, THREE.Mesh> }
  const [hovered, setHovered] = useState<string | null>(null)

  const getStatus = (tooth: number): 'normal' | 'selected' | 'planned' | 'treated' => {
    if (selectedTeeth.includes(tooth)) return 'selected'
    if (plannedTeeth.includes(tooth)) return 'planned'
    if (treatedTeeth.includes(tooth)) return 'treated'
    return 'normal'
  }

  const toothPoints = useMemo(() => {
    const out: ToothPoints = {}
    for (const [nodeName, fdi] of Object.entries(TOOTH_NODE_TO_FDI)) {
      const node = nodes[nodeName]
      if (!node) continue
      const isUpper = Math.floor(fdi / 10) <= 2
      out[fdi] = computeAttachmentPoints(node, isUpper)
    }
    return out
  }, [nodes])

  useEffect(() => {
    onPointsReady?.(toothPoints)
  }, [toothPoints, onPointsReady])

  return (
    <>
      <group position={RECENTER}>
        {GUM_NODES.map((nodeName) => {
          const node = nodes[nodeName]
          if (!node) return null
          return (
            <mesh key={nodeName} geometry={node.geometry} position={node.position} quaternion={node.quaternion} scale={node.scale}>
              <meshStandardMaterial color={GUM_COLOR} roughness={GUM_ROUGHNESS} />
            </mesh>
          )
        })}

        {Object.entries(TOOTH_NODE_TO_FDI).map(([nodeName, fdi]) => {
          const node = nodes[nodeName]
          if (!node) return null
          const condition = conditions[fdi]
          if (condition === 'mungon') return null // missing tooth — leave a real gap

          return (
            <mesh
              key={nodeName}
              geometry={node.geometry}
              position={node.position}
              quaternion={node.quaternion}
              scale={node.scale}
              onClick={(e) => { e.stopPropagation(); onSelect(fdi) }}
              onPointerOver={(e) => { e.stopPropagation(); setHovered(nodeName) }}
              onPointerOut={() => setHovered(null)}
            >
              <meshPhysicalMaterial {...toothMaterialProps(condition, getStatus(fdi), hovered === nodeName)} />
            </mesh>
          )
        })}
      </group>

      {/* Add-ons: toothPoints values already include RECENTER, so these
          render at the top level (no enclosing offset) to match. */}
      {ALL_FDI.map((fdi) => {
        const condition = conditions[fdi]
        if (condition === 'mungon') return null
        const points = toothPoints[fdi]
        if (!points) return null
        const isRootCanal = condition === 'kanal_rrenjor'
        const canalAxis = isRootCanal ? axisTransform(points.gumline, points.occlusal) : null

        return (
          <group key={`addon-${fdi}`}>
            {condition === 'mbushje' && (
              <mesh position={points.occlusal} scale={[1, 0.35, 1]}>
                <sphereGeometry args={[0.16, 12, 8]} />
                <meshStandardMaterial color={FILLING_METAL} roughness={0.3} metalness={0.6} />
              </mesh>
            )}

            {condition === 'implant' && (
              <mesh position={points.gumline}>
                <cylinderGeometry args={[0.09, 0.11, 0.32, 8]} />
                <meshStandardMaterial color={METAL_POST} roughness={0.35} metalness={0.85} />
              </mesh>
            )}

            {canalAxis && (
              <mesh position={canalAxis.position} quaternion={canalAxis.quaternion}>
                <cylinderGeometry args={[0.045, 0.045, canalAxis.length * 0.82, 8]} />
                <meshStandardMaterial color={ROOT_CANAL_MARKER} roughness={0.5} />
              </mesh>
            )}

            {showLabels && (
              <Html position={points.gumline} center distanceFactor={7}>
                <div style={{
                  padding: '2px 5px', borderRadius: 4, background: 'rgba(0,0,0,0.75)', color: '#fff',
                  fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                  {formatToothNumber(fdi, numberingSystem)}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}

useGLTF.preload(MODEL_PATH)
