import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

const globals = {
  time: 0,
  deltaTime: 0
}

function removeArrayElement (array, element) {
  const ndx = array.indexOf(element)
  if (ndx >= 0) {
    array.splice(ndx, 1)
  }
}

class GameObject {
  constructor (parent, name) {
    this.name = name
    this.components = []
    this.transform = new THREE.Object3D()
    parent.add(this.transform)
  }

  addComponent (ComponentType, ...args) {
    const component = new ComponentType(this, ...args)
    this.components.push(component)
    return component
  }

  removeComponent (component) {
    removeArrayElement(this.components, component)
  }

  getComponent (ComponentType) {
    return this.components.find(c => c instanceof ComponentType)
  }

  update () {
    for (const component of this.components) {
      component.update()
    }
  }
}

// 所有组件的基础
class Component {
  constructor (gameObject) {
    this.gameObject = gameObject
  }

  update () {
  }
}

class SafeArray {
  constructor () {
    this.array = []
    this.addQueue = []
    this.removeQueue = new Set()
  }

  get isEmpty () {
    return this.addQueue.length + this.array.length > 0
  }

  add (element) {
    this.addQueue.push(element)
  }

  remove (element) {
    this.removeQueue.add(element)
  }

  forEach (fn) {
    this._addQueued()
    this._removeQueued()
    for (const element of this.array) {
      if (this.removeQueue.has(element)) {
        continue
      }
      fn(element)
    }
    this._removeQueued()
  }

  _addQueued () {
    if (this.addQueue.length) {
      this.array.splice(this.array.length, 0, ...this.addQueue)
      this.addQueue = []
    }
  }

  _removeQueued () {
    if (this.removeQueue.size) {
      this.array = this.array.filter(element => !this.removeQueue.has(element))
      this.removeQueue.clear()
    }
  }
}

class GameObjectManager {
  constructor () {
    this.gameObjects = new SafeArray()
  }

  createGameObject (parent, name) {
    const gameObject = new GameObject(parent, name)
    this.gameObjects.add(gameObject)
    return gameObject
  }

  removeGameObject (gameObject) {
    this.gameObjects.remove(gameObject)
  }

  update () {
    this.gameObjects.forEach(gameObject => gameObject.update())
  }
}

class SkinInstance extends Component {
  constructor (gameObject, model) {
    super(gameObject)
    this.model = model
    this.animRoot = SkeletonUtils.clone(this.model.gltf.scene)
    this.mixer = new THREE.AnimationMixer(this.animRoot)
    gameObject.transform.add(this.animRoot)
    this.actions = {}
  }

  setAnimation (animName) {
    const clip = this.model.animations[animName]
    // 关闭所有当前动作
    for (const action of Object.values(this.actions)) {
      action.enabled = false
    }
    // 为剪辑获取或创建现有动作
    const action = this.mixer.clipAction(clip)
    action.enabled = true
    action.reset()
    action.play()
    this.actions[animName] = action
  }

  update () {
    this.mixer.update(globals.deltaTime)
  }
}
