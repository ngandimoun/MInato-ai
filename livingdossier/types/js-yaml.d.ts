// Type definitions for js-yaml
declare module 'js-yaml' {
  export function load(input: string, options?: any): any;
  export function loadAll(input: string, callback?: (document: any) => void, options?: any): any;
  export function dump(object: any, options?: any): string;
  export function safeDump(object: any, options?: any): string;
  export function safeLoad(input: string, options?: any): any;
  export function safeLoadAll(input: string, callback?: (document: any) => void, options?: any): any;
} 