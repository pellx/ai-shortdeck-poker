import { useRef, useEffect } from 'react'
import * as THREE from 'three'

/* ============================================
   3D 牌桌场景
   ============================================ */

function getCameraTarget(phase, turn) {
  switch (phase) {
    case 'idle':     return { az:   0, el: 60, dist: 12 }
    case 'intro':    return { az:  25, el: 55, dist: 11 }
    case 'ante':     return { az:   0, el: 78, dist:  9 }
    case 'dealing':  return { az:  18, el: 62, dist: 10 }
    case 'betting':
      if (turn === 'left')  return { az: -70, el: 42, dist: 7.5 }
      if (turn === 'right') return { az:  70, el: 42, dist: 7.5 }
      return { az: 0, el: 55, dist: 10 }
    case 'community':return { az:   0, el: 68, dist:  8 }
    case 'showdown': return { az:   0, el: 22, dist:  6.5 }
    case 'result':   return { az: -25, el: 38, dist: 10 }
    default:         return { az:   0, el: 60, dist: 12 }
  }
}

export default function ThreeScene({ phase, turn, pot }) {
  const containerRef = useRef(null)
  const propsRef = useRef({ phase, turn, pot })
  const stateRef = useRef({
    renderer: null,
    camera: null,
    scene: null,
    chipGroup: null,
    currentAz: 0,
    currentEl: 60,
    currentDist: 12,
    animId: null,
  })

  useEffect(() => {
    propsRef.current = { phase, turn, pot }
  }, [phase, turn, pot])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    /* ---- 场景 ---- */
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050505)
    scene.fog = new THREE.Fog(0x050505, 10, 25)

    /* ---- 相机 ---- */
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )

    /* ---- 渲染器 ---- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    stateRef.current.scene = scene
    stateRef.current.camera = camera
    stateRef.current.renderer = renderer

    /* ---- 灯光 ---- */
    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    scene.add(ambient)

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
    mainLight.position.set(3, 8, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.25)
    fillLight.position.set(-5, 4, -3)
    scene.add(fillLight)

    const spot = new THREE.SpotLight(0xffddaa, 0.6)
    spot.position.set(0, 10, 0)
    spot.angle = Math.PI / 5
    spot.penumbra = 0.6
    spot.decay = 2
    spot.distance = 30
    scene.add(spot)

    /* ---- 牌桌 ---- */
    buildTable(scene)

    /* ---- 底池筹码 ---- */
    const chipGroup = new THREE.Group()
    scene.add(chipGroup)
    stateRef.current.chipGroup = chipGroup
    updateChips(chipGroup, pot)

    /* ---- 动画循环 ---- */
    const st = stateRef.current
    const tick = () => {
      st.animId = requestAnimationFrame(tick)

      const { phase: p, turn: t } = propsRef.current
      const target = getCameraTarget(p, t)
      st.currentAz  += (target.az  - st.currentAz)  * 0.025
      st.currentEl  += (target.el  - st.currentEl)  * 0.025
      st.currentDist += (target.dist - st.currentDist) * 0.025

      const phi = (90 - st.currentEl) * (Math.PI / 180)
      const theta = st.currentAz * (Math.PI / 180)

      camera.position.x = st.currentDist * Math.sin(phi) * Math.sin(theta)
      camera.position.y = st.currentDist * Math.cos(phi)
      camera.position.z = st.currentDist * Math.sin(phi) * Math.cos(theta)
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    tick()

    /* ---- resize ---- */
    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (st.animId) cancelAnimationFrame(st.animId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- pot 变化时更新筹码 ---- */
  useEffect(() => {
    const { chipGroup } = stateRef.current
    if (chipGroup) updateChips(chipGroup, pot)
  }, [pot])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
      }}
    />
  )
}

/* ============================================
   场景构建函数
   ============================================ */

/* 跑道形工具函数 */
function createTrackShape(radius, halfLength) {
  const shape = new THREE.Shape()
  shape.moveTo(-halfLength, -radius)
  shape.lineTo(halfLength, -radius)
  shape.absarc(halfLength, 0, radius, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(-halfLength, radius)
  shape.absarc(-halfLength, 0, radius, Math.PI / 2, 3 * Math.PI / 2, false)
  return shape
}

function createTrackMesh(shape, depth, material, yPosition) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  })
  geo.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geo, material)
  mesh.position.y = yPosition
  return mesh
}

function buildTable(scene) {
  /* 跑道形参数 — 整体更大，比例 1.67:1 */
  const R = 4.0        // 半圆半径
  const H = 3.0        // 直边半长
  const D = 0.35       // 白线等距偏移量

  /* 材质 */
  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x1b5e2e,
    roughness: 0.95,
    metalness: 0,
  })
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x3d2817,
    roughness: 0.6,
    metalness: 0.1,
  })
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.25,
  })

  /* 木框底座（最大） */
  const baseShape = createTrackShape(R + 0.25, H + 0.25)
  const base = createTrackMesh(baseShape, 0.25, baseMat, -0.25)
  base.castShadow = true
  scene.add(base)

  /* 绿色桌面布 */
  const feltShape = createTrackShape(R, H)
  const felt = createTrackMesh(feltShape, 0.02, feltMat, 0.01)
  felt.receiveShadow = true
  scene.add(felt)

  /* 白色装饰线 — 等距：只减小半径，直边半长不变 */
  const outerLine = createTrackShape(R - D, H)      // 圆弧半径减 D，直边长度不变
  const innerLine = createTrackShape(R - D - 0.12, H) // 再内收一圈形成线宽
  outerLine.holes.push(innerLine)
  const lineGeo = new THREE.ExtrudeGeometry(outerLine, {
    depth: 0.005,
    bevelEnabled: false,
  })
  lineGeo.rotateX(-Math.PI / 2)
  const line = new THREE.Mesh(lineGeo, lineMat)
  line.position.y = 0.035
  scene.add(line)

  /* 桌腿（4根，支撑在跑道形的四个角） */
  const legGeo = new THREE.CylinderGeometry(0.16, 0.13, 3.5, 12)
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0f, roughness: 0.7 })
  const legPositions = [
    [ H + 0.2, -1.75,  R - 0.4],
    [-H - 0.2, -1.75,  R - 0.4],
    [ H + 0.2, -1.75, -R + 0.4],
    [-H - 0.2, -1.75, -R + 0.4],
  ]
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, legMat)
    leg.position.set(x, y, z)
    leg.castShadow = true
    scene.add(leg)
  })

  /* 地面 */
  const floorGeo = new THREE.PlaneGeometry(40, 40)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1 })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3.5
  floor.receiveShadow = true
  scene.add(floor)
}

function updateChips(group, pot) {
  // 清除旧筹码
  while (group.children.length > 0) {
    const child = group.children[0]
    child.geometry.dispose()
    child.material.dispose()
    group.remove(child)
  }

  if (pot <= 0) return

  const chipColors = [0xc41e3a, 0x1e3ac4, 0x1e8c1e, 0xd4af37, 0xf0f0f0]
  const count = Math.min(40, Math.max(5, Math.floor(pot / 15)))

  for (let i = 0; i < count; i++) {
    const chipGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.028, 16)
    const chipMat = new THREE.MeshStandardMaterial({
      color: chipColors[i % chipColors.length],
      roughness: 0.4,
      metalness: 0.2,
    })
    const chip = new THREE.Mesh(chipGeo, chipMat)

    // 堆叠成小山
    const angle = (i / count) * Math.PI * 4 + Math.random() * 0.5
    const radius = 0.15 + (i / count) * 0.25
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.1
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.1
    const y = 0.015 + i * 0.025

    chip.position.set(x, y, z)
    chip.rotation.y = Math.random() * Math.PI
    chip.castShadow = true
    group.add(chip)
  }
}
