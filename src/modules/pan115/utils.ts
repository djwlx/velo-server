export async function fetchRecursively(
  condition: () => boolean,
  delay: number,
  fetcher: () => Promise<void>,
) {
  if (!condition()) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, delay));

  await fetcher();

  return fetchRecursively(condition, delay, fetcher);
}
