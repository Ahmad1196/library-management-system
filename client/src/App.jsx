import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div className="bg-blue-500 text-white p-4">Hello, World!</div>
    </>
  )
}

export default App
