/* @refresh reload */
import { mountApp } from './app/mountApp'
import { createUserscriptRuntime } from './runtime'

const isExerciseContentFrame = location.pathname.startsWith('/v2/web/iframe-exercise/')

if (window.self === window.top || isExerciseContentFrame) {
  createUserscriptRuntime()
  mountApp()
}
