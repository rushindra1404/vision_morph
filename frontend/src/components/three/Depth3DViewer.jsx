import React, { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function buildPointCloudFromDepth(depthImageUrl, pointSize = 1.5) {
  // Basic client-side point cloud from depth image luminance. This is a fallback
  // if backend does not provide a PLY/mesh URL. For production datasets use
  // server-generated point clouds for accuracy.
  const loader = new THREE.TextureLoader()
  return new Promise((resolve, reject) => {
    loader.load(
      depthImageUrl,
      (tex) => {
        const width = tex.image.width
        const height = tex.image.height
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(tex.image, 0, 0)
        const img = ctx.getImageData(0, 0, width, height)

        const positions = []
        const colors = []
        const color = new THREE.Color()

        for (let y = 0; y < height; y += 2) {
          for (let x = 0; x < width; x += 2) {
            const i = (y * width + x) * 4
            const d = img.data[i] / 255 // assume grayscale depth
            const zx = (x / width - 0.5) * 2
            const zy = (y / height - 0.5) * -2
            const zz = d * 2 - 1
            positions.push(zx, zy, zz)
            color.setRGB(d, d, d)
            colors.push(color.r, color.g, color.b)
          }
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        const material = new THREE.PointsMaterial({ size: pointSize / 200, vertexColors: true })
        const points = new THREE.Points(geometry, material)
        resolve(points)
      },
      undefined,
      (err) => reject(err)
    )
  })
}

async function buildMeshFromDepth(depthImageUrl, options) {
  const { zScale = 1.0, smoothing = 0.0 } = options || {}
  const loader = new THREE.TextureLoader()
  return new Promise((resolve, reject) => {
    loader.load(
      depthImageUrl,
      (tex) => {
        const width = tex.image.width
        const height = tex.image.height
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(tex.image, 0, 0)
        if (smoothing > 0) {
          // Simple multi-pass blur approximation
          const passes = Math.min(3, Math.ceil(smoothing))
          for (let i = 0; i < passes; i++) {
            ctx.globalAlpha = 0.5
            ctx.drawImage(canvas, -1, 0)
            ctx.drawImage(canvas, 1, 0)
            ctx.drawImage(canvas, 0, -1)
            ctx.drawImage(canvas, 0, 1)
            ctx.globalAlpha = 1
          }
        }
        const img = ctx.getImageData(0, 0, width, height)

        // Build geometry grid
        const geometry = new THREE.PlaneGeometry(2, 2, Math.floor(width / 2), Math.floor(height / 2))
        geometry.rotateX(-Math.PI / 2)

        const positions = geometry.attributes.position
        const vertCount = positions.count

        // Map vertices to depth image pixels
        for (let i = 0; i < vertCount; i++) {
          const vx = i % (geometry.parameters.widthSegments + 1)
          const vy = Math.floor(i / (geometry.parameters.widthSegments + 1))

          const px = Math.floor((vx / geometry.parameters.widthSegments) * (width - 1))
          const py = Math.floor((vy / geometry.parameters.heightSegments) * (height - 1))
          const idx = (py * width + px) * 4
          const d = img.data[idx] / 255
          const y = (d * 2 - 1) * zScale
          positions.setY(i, y)
        }

        positions.needsUpdate = true
        geometry.computeVertexNormals()

        const material = new THREE.MeshStandardMaterial({ color: 0x88aaff, metalness: 0.0, roughness: 0.9, side: THREE.DoubleSide, flatShading: false })
        const mesh = new THREE.Mesh(geometry, material)
        resolve(mesh)
      },
      undefined,
      (err) => reject(err)
    )
  })
}

export default function Depth3DViewer({ depthData, settings }) {
  const mountRef = useRef(null)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const controlsRef = useRef(null)

  const depthImageUrl = useMemo(() => depthData?.depth_map_gray || depthData?.depth_map || depthData?.depthMap, [depthData])

  useEffect(() => {
    const mount = mountRef.current
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setClearColor(0x000000, 1)
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.01, 100)
    camera.position.set(0, 0, 2.5)
    scene.add(camera)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1)
    dirLight.position.set(1, 1, 1)
    scene.add(dirLight)
    const ambLight = new THREE.AmbientLight(0xffffff, 0.2)
    scene.add(ambLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controlsRef.current = controls

    let stopped = false
    const animate = () => {
      if (stopped) return
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      stopped = true
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  // React to lighting changes
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const lights = scene.children.filter((c) => c.isLight)
    for (const l of lights) {
      if (l.isDirectionalLight) l.intensity = settings?.directionalLight ?? 1
      if (l.isAmbientLight) l.intensity = settings?.ambientLight ?? 0.2
    }
  }, [settings?.directionalLight, settings?.ambientLight])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    // Clear previous mesh/points (keep lights)
    const toRemove = scene.children.filter((c) => !(c.isCamera || c.isLight))
    toRemove.forEach((c) => scene.remove(c))

    async function loadContent() {
      if (depthData?.gltf_url) {
        // Future: load GLTF if backend provides
      } else if (depthData?.ply_url) {
        // Future: load PLY if backend provides
      } else if (depthImageUrl) {
        if (settings?.view3DMode === 'mesh') {
          const mesh = await buildMeshFromDepth(depthImageUrl, { zScale: 0.8, smoothing: settings?.meshSmoothing || 0 })
          scene.add(mesh)
        } else {
          const pc = await buildPointCloudFromDepth(depthImageUrl, settings?.pointSize || 1.5)
          scene.add(pc)
        }
      }
    }
    loadContent()
  }, [depthData, depthImageUrl, settings?.pointSize, settings?.view3DMode, settings?.meshSmoothing])

  return (
    <div ref={mountRef} className="w-full h-full rounded bg-black" role="img" aria-label="Interactive 3D depth visualization" />
  )
}


