export type ScreenOrientation = 'portrait' | 'landscape';

export function getScreenOrientation(width: number, height: number): ScreenOrientation {
  return width >= height ? 'landscape' : 'portrait';
}

export function shouldPromptLandscape(
  width: number,
  height: number,
  isCoarsePointer: boolean,
): boolean {
  return isCoarsePointer && getScreenOrientation(width, height) === 'portrait';
}

export async function requestLandscapeOrientation(): Promise<boolean> {
  const orientation = globalThis.screen?.orientation as {
    lock?: (orientation: 'landscape') => Promise<void>;
  } | undefined;
  if (!orientation?.lock) return false;

  try {
    await orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
}
