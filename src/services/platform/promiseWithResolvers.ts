declare global {
  interface PromiseConstructor {
    withResolvers: <T>() => {
      promise: Promise<T>
      resolve: (value: T | PromiseLike<T>) => void
      reject: (reason?: unknown) => void
    }
  }
}

export function installPromiseWithResolversFallback(): void {
  if (Promise.withResolvers !== undefined)
    return

  Promise.withResolvers = function withResolvers<T>() {
    let resolveValue!: (value: T | PromiseLike<T>) => void
    let rejectValue!: (reason?: unknown) => void
    const promise = new Promise<T>((resolve, reject) => {
      resolveValue = resolve
      rejectValue = reject
    })
    return { promise, resolve: resolveValue, reject: rejectValue }
  }
}
