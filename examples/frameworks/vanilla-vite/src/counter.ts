import type { TranslationProxy } from 'tradux'

export function setupCounter(element: HTMLButtonElement, t: TranslationProxy) {
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    element.innerHTML = `${t.hero.counter} ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(0)
}
