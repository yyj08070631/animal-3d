<template>
  <canvas v-show="done" id="c"></canvas>
  <div v-show="!done" id="loading">
    <div>
      <div>Loading...</div>
      <div class="progress"><div id="progressbar" :style="{ width: progress }"></div></div>
    </div>
  </div>
</template>
<script>
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

export default {
  name: 'App',
  components: {
  },
  data () {
    return {
      done: false,
      progress: ''
    }
  },
  mounted () {
    const canvas = document.querySelector('#c')
    this.renderer = new THREE.WebGLRenderer({ canvas })
    this.renderer.outputEncoding = THREE.sRGBEncoding
    const fov = 45
    const aspect = 2
    const near = 0.1
    const far = 100
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this.camera.position.set(0, 20, 40)
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('white')
    this.mixers = []
    this.mixerInfos = []
    this.then = 0
    // const boxWidth = 1
    // const boxHeight = 1
    // const boxDepth = 1
    // const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth)
    // const material = new THREE.MeshBasicMaterial({ color: 0x44aa88 })
    // const cube = new THREE.Mesh(geometry, material)
    // scene.add(cube)
    const controls = new OrbitControls(this.camera, canvas)
    controls.target.set(0, 5, 0)
    controls.update()

    const addLight = (...pos) => {
      const color = 0xFFFFFF
      const intensity = 0.8
      const light = new THREE.DirectionalLight(color, intensity)
      light.position.set(...pos)
      this.scene.add(light)
      this.scene.add(light.target)
    }
    addLight(5, 5, 2)
    addLight(-5, 5, 5)

    const manager = new THREE.LoadingManager()
    const models = {
      pig: { url: '/models/animals/Pig.gltf' },
      cow: { url: '/models/animals/Cow.gltf' },
      llama: { url: '/models/animals/Llama.gltf' },
      pug: { url: '/models/animals/Pug.gltf' },
      sheep: { url: '/models/animals/Sheep.gltf' },
      zebra: { url: '/models/animals/Zebra.gltf' },
      horse: { url: '/models/animals/Horse.gltf' },
      knight: { url: '/models/knight/KnightCharacter.gltf' }
    }
    const gltfLoader = new GLTFLoader(manager)
    for (const model of Object.values(models)) {
      gltfLoader.load(model.url, (gltf) => {
        model.gltf = gltf
      })
    }
    const prepModelsAndAnimations = () => {
      Object.values(models).forEach(model => {
        const animsByName = {}
        model.gltf.animations.forEach((clip) => {
          animsByName[clip.name] = clip
        })
        model.animations = animsByName
      })
    }
    manager.onLoad = () => {
      this.done = true
      prepModelsAndAnimations()

      Object.values(models).forEach((model, ndx) => {
        const clonedScene = SkeletonUtils.clone(model.gltf.scene)
        const root = new THREE.Object3D()
        root.add(clonedScene)
        this.scene.add(root)
        root.position.x = (ndx - 3) * 3

        const mixer = new THREE.AnimationMixer(clonedScene)
        const actions = Object.values(model.animations).map((clip) => {
          return mixer.clipAction(clip)
        })
        const mixerInfo = {
          mixer,
          actions,
          actionNdx: -1
        }
        this.mixerInfos.push(mixerInfo)
        this.playNextAction(mixerInfo)
      })
      requestAnimationFrame(this.render)
    }
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.progress = `${itemsLoaded / itemsTotal * 100 | 0}%`
    }

    window.addEventListener('keydown', (e) => {
      const mixerInfo = this.mixerInfos[e.keyCode - 49]
      if (!mixerInfo) {
        return
      }
      this.playNextAction(mixerInfo)
    })
  },
  methods: {
    render () {
      const now = Date.now() * 0.001 // 转换为秒
      const deltaTime = now - this.then
      this.then = now
      if (this.resizeRendererToDisplaySize()) {
        const canvas = this.renderer.domElement
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight
        this.camera.updateProjectionMatrix()
      }
      for (const { mixer } of this.mixerInfos) {
        mixer.update(deltaTime)
      }
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.render)
    },
    resizeRendererToDisplaySize () {
      const canvas = this.renderer.domElement
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const needResize = canvas.width !== width || canvas.height !== height
      if (needResize) {
        this.renderer.setSize(width, height, false)
      }
      return needResize
    },
    playNextAction (mixerInfo) {
      const { actions, actionNdx } = mixerInfo
      const nextActionNdx = (actionNdx + 1) % actions.length
      mixerInfo.actionNdx = nextActionNdx
      actions.forEach((action, ndx) => {
        const enabled = ndx === nextActionNdx
        action.enabled = enabled
        if (enabled) {
          action.play()
        }
      })
    }
  }
}
</script>
<style>
html, body {
  margin: 0;
  height: 100%;
}
#c {
  width: 100%;
  height: 100%;
  display: block;
}
#loading {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: xx-large;
  font-family: sans-serif;
}
#loading>div>div {
  padding: 2px;
}
.progress {
  width: 50vw;
  border: 1px solid black;
}
#progressbar {
  width: 0;
  transition: width ease-out .5s;
  height: 1em;
  background-color: #888;
  background-image: linear-gradient(-45deg, rgba(255, 255, 255, .5) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, .5) 50%, rgba(255, 255, 255, .5) 75%, transparent 75%, transparent);
  background-size: 50px 50px;
  animation: progressanim 2s linear infinite;
}
@keyframes progressanim {
  0% {
    background-position: 50px 50px;
  }
  100% {
    background-position: 0 0;
  }
}
</style>
