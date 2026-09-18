const GLOBAL_LOCK_KEY = '__global__';
const runningTasks = new Map<string, Promise<unknown>>();

export const runExclusive = <T>(task: () => T | Promise<T>, key = GLOBAL_LOCK_KEY): Promise<T> => {
  const runningTask = runningTasks.get(key);
  if (runningTask) return runningTask as Promise<T>;

  let taskPromise: Promise<T>;
  taskPromise = Promise.resolve()
    .then(task)
    .finally(() => {
      if (runningTasks.get(key) === taskPromise) runningTasks.delete(key);
    });
  runningTasks.set(key, taskPromise);
  return taskPromise;
};

export const isRunning = (key = GLOBAL_LOCK_KEY): boolean => runningTasks.has(key);
