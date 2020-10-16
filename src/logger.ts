class Logger {
  constructor(readonly name: string) {}

  log(...args: unknown[]) {
    console.log(new Date(), `[${this.name}]`, ...args);
  }
}

export function getLogger(name: string) {
  return new Logger(name);
}
