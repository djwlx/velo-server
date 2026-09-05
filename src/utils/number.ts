export function randomInt(min: number, max: number): number {
  const [low, high] = min > max ? [max, min] : [min, max];
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

export function pickRandom<T>(items: T[]): T | undefined {
  if (!items.length) return undefined;
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return items[random[0] % items.length];
}
