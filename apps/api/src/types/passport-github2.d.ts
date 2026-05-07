declare module 'passport-github2' {
  // Minimal shim — full types are not published. The Strategy constructor
  // accepts an options object and a verify function; both are loosely typed
  // here on purpose since we wrap it with PassportStrategy().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Strategy: any;
}
