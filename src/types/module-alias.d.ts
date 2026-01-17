declare module 'module-alias' {
  export function addAliases(aliases: Record<string, string>): void;
  export function addPath(path: string): void;
  export function isPathMatchesAlias(path: string, alias: string): boolean;
  export function isAliasConfigured(alias: string): boolean;
  export function removeAlias(alias: string): void;
  export function reset(): void;
  
  // This is the default export
  const moduleAlias: {
    addAliases: typeof addAliases;
    addPath: typeof addPath;
    isPathMatchesAlias: typeof isPathMatchesAlias;
    isAliasConfigured: typeof isAliasConfigured;
    removeAlias: typeof removeAlias;
    reset: typeof reset;
  };
  
  export default moduleAlias;
}
