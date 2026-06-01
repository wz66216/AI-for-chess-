export function makeRunId(randomUuid: (() => string | undefined) | undefined, counter: number) {
  return randomUuid?.() ?? `run-${counter}`;
}
