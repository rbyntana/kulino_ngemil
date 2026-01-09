export function withSubmitLock<T extends (...args: any[]) => Promise<void>>(
  fn: T
) {
  let locked = false

  return async (...args: Parameters<T>) => {
    if (locked) return
    locked = true

    try {
      await fn(...args)
    } finally {
      locked = false
    }
  }
}
