export function randomInt(min: number, max: number): number {
  const [low, high] = min > max ? [max, min] : [min, max];
  return Math.floor(Math.random() * (high - low + 1)) + low;
}
