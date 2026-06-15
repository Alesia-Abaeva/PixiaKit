import React from 'react'

import './App.css'
import { SCENES } from './pixi/scene'


/**
 * 
 * Pixi создаёт сцену.
 * Skia рисует эту же сцену своим способом.
 * Наша задача — перевести Pixi-объекты в Skia-рисование.
 */
function App() {
  const [currentScene, setCurrentScene] = React.useState(0)

  const sceneFactory = SCENES[currentScene].factory
  const scene = React.useMemo(() => sceneFactory(), [currentScene])

  return (
    <main className="App">
      <button onClick={() => setCurrentScene(0)}>Scene 1</button>
      <button onClick={() => setCurrentScene(1)}>Scene 2</button>
      <button onClick={() => setCurrentScene(2)}>Scene 3</button>
    </main>
  )
}

export default App
