import { render } from 'solid-js/web'
import { ROOT_ID } from '../constants/userscript'
import App from './App'
import styles from './App.module.css'

const classes = styles as { root: string }

export function mountApp(target: HTMLElement = document.body): VoidFunction {
  const app = document.createElement('div')
  app.id = ROOT_ID
  app.className = classes.root
  target.append(app)

  return render(() => <App />, app)
}
