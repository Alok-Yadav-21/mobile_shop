import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree, useFrame, extend } from '@react-three/fiber'
import ThreeGlobe from 'three-globe'
import { Color, Fog, PointLight, AmbientLight, DirectionalLight } from 'three'

// Aceternity's three-globe component, pointed at the branch network instead of the demo's
// random worldwide arcs.
//
// `extend` registers ThreeGlobe as a JSX element so react-three-fiber can render <threeGlobe />
// declaratively; without it the tag is unknown and the canvas renders empty.
extend({ ThreeGlobe })

const RING_PROPAGATION_SPEED = 3
const ASPECT = 1.2
const CAMERA_Z = 400

function GlobeMesh({ points, arcs, config }) {
  const ref = useRef()
  const [ready, setReady] = useState(false)

  useEffect(() => { if (ref.current) setReady(true) }, [])

  useEffect(() => {
    if (!ready || !ref.current) return
    const g = ref.current

    g.globeMaterial().color = new Color(config.globeColor)
    g.globeMaterial().emissive = new Color(config.emissive)
    g.globeMaterial().emissiveIntensity = config.emissiveIntensity
    g.globeMaterial().shininess = config.shininess

    g.globeImageUrl(config.globeImageUrl)
      .showAtmosphere(true)
      .atmosphereColor(config.atmosphereColor)
      .atmosphereAltitude(config.atmosphereAltitude)

    // Branch markers. Every branch sits within a few miles of the others, so the points are
    // small and the ring pulse is what actually makes the cluster findable on a spinning globe.
    g.pointsData(points)
      .pointColor((d) => d.color)
      .pointsMerge(true)
      .pointAltitude(0.02)
      .pointRadius(0.55)

    g.ringsData(points)
      .ringColor((d) => () => d.color)
      .ringMaxRadius(3)
      .ringPropagationSpeed(RING_PROPAGATION_SPEED)
      .ringRepeatPeriod(1600)

    if (arcs?.length) {
      g.arcsData(arcs)
        .arcStartLat((d) => d.startLat)
        .arcStartLng((d) => d.startLng)
        .arcEndLat((d) => d.endLat)
        .arcEndLng((d) => d.endLng)
        .arcColor((d) => d.color)
        .arcAltitude((d) => d.arcAlt)
        .arcStroke(0.4)
        .arcDashLength(0.9)
        .arcDashGap(4)
        .arcDashAnimateTime(config.arcTime)
    }
  }, [ready, points, arcs, config])

  // three-globe does not spin itself — the autoRotate flag in the config is only meaningful
  // because this drives it. Rotating the object rather than orbiting a camera keeps the
  // lighting fixed, so the lit face stays toward the viewer.
  useFrame((_, delta) => {
    if (config.autoRotate && ref.current) {
      ref.current.rotation.y += delta * (config.autoRotateSpeed * 0.12)
    }
  })

  return <threeGlobe ref={ref} />
}

function Rig({ config }) {
  const { camera, gl, scene } = useThree()
  useEffect(() => {
    scene.fog = new Fog(0x0d0d0d, 400, 2000)
    camera.position.z = CAMERA_Z
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }, [camera, gl, scene])

  return (
    <>
      <ambientLight color={config.ambientLight} intensity={1.4} />
      <directionalLight color={config.directionalLeftLight} position={[-400, 100, 400]} />
      <directionalLight color={config.directionalTopLight} position={[-200, 500, 200]} />
      <pointLight color={config.pointLight} position={[-200, 500, 200]} intensity={0.8} />
    </>
  )
}

const DEFAULTS = {
  // The night-lights texture from three-globe's own examples: dark enough to sit on a black
  // panel while still showing coastlines, so the sphere reads as Earth rather than a ball.
  globeImageUrl: '//unpkg.com/three-globe/example/img/earth-night.jpg',
  globeColor: '#1b1b1f',
  emissive: '#1d2233',
  emissiveIntensity: 0.35,
  shininess: 0.7,
  atmosphereColor: '#F5333F',
  atmosphereAltitude: 0.16,
  ambientLight: '#ffffff',
  directionalLeftLight: '#ffffff',
  directionalTopLight: '#ffffff',
  pointLight: '#F5333F',
  arcTime: 1400,
  autoRotate: true,
  autoRotateSpeed: 0.6,
}

export function Globe3D({ points = [], arcs = [], config = {}, className = '' }) {
  const merged = useMemo(() => ({ ...DEFAULTS, ...config }), [config])
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    // A globe is decoration on top of a working list and map, so a device without WebGL
    // should simply not get it rather than see a broken canvas.
    try {
      const c = document.createElement('canvas')
      setSupported(!!(c.getContext('webgl2') || c.getContext('webgl')))
    } catch { setSupported(false) }
  }, [])

  if (!supported) return null

  return (
    <div className={className}>
      <Canvas
        camera={{ fov: 50, aspect: ASPECT, near: 180, far: 1800, position: [0, 0, CAMERA_Z] }}
        gl={{ antialias: true, alpha: true }}
      >
        <Rig config={merged} />
        <GlobeMesh points={points} arcs={arcs} config={merged} />
      </Canvas>
    </div>
  )
}
