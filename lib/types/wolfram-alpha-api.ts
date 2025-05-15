// // FILE: lib/types/wolfram-alpha-api.d.ts
// // (Content from finalcodebase.txt - verified)
// declare module "wolfram-alpha-api" {
//   interface WolframAlphaOptions {
//     units?: "metric" | "imperial";
//     timeout?: number;
//     // Add other potential options based on library usage if needed
//     // assumptioncorrect?: string;
//     // podtimeout?: number;
//     // scantimeout?: number;
//     // async?: string;
//   }

//   interface WolframAlphaAPI {
//     /** Gets the short answer result */
//     getResult(query: string, options?: WolframAlphaOptions): Promise<string>;
//     /** Gets the full result pods (if using that endpoint) */
//     // getFull?(query: string | object): Promise<any>; // Define if needed
//   }

//   // Declares the default export function signature
//   function WolframAlphaAPI(appId: string): WolframAlphaAPI;

//   export default WolframAlphaAPI;
// }