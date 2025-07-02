/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as gameOrchestrator from "../gameOrchestrator.js";
import type * as games from "../games.js";
import type * as questScheduler from "../questScheduler.js";
import type * as tournamentIntegration from "../tournamentIntegration.js";
import type * as tournaments from "../tournaments.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  gameOrchestrator: typeof gameOrchestrator;
  games: typeof games;
  questScheduler: typeof questScheduler;
  tournamentIntegration: typeof tournamentIntegration;
  tournaments: typeof tournaments;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
