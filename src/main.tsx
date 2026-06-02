/* @refresh reload */
import { mountApp } from './app/mountApp'
import { createUserscriptRuntime } from './runtime'

if (window.self === window.top) {
  createUserscriptRuntime()
  mountApp()
}
