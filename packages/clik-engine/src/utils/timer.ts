export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function interval(ms: number, callback: () => void | Promise<void>): () => void {
  const id = setInterval(callback, ms);
  return () => clearInterval(id);
}
