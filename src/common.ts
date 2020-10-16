export type EntryPoint = (args: string[]) => Promise<number>;

const entryPoints: Record<string, EntryPoint> = {};

export function registerEntryPoint(name: string, entryPoint: EntryPoint) {
  entryPoints[name] = entryPoint;
}

export function getEntryPoint(name: string): EntryPoint | undefined {
  return entryPoints[name];
}
