// FILE: lib/supabaseClient.ts
import {
  createClient as createSupabaseClientGeneric,
  SupabaseClient,
} from "@supabase/supabase-js";
import { appConfig } from "./config"; // appConfig now re-exports the unified config
import {
  UserProfile,
  UserState,
  UserPushSubscription,
  PredefinedPersona,
  UserPersona,
  UserIntegration,
} from "./types/index";
import { logger } from "../memory-framework/config"; // Unified logger
// import { config as frameworkConfig } from "../memory-framework/config"; // Pas nécessaire si appConfig est déjà le config unifié
import { getSupabaseAdminClient } from "./supabase/server"; // Use the consolidated admin client from @supabase/ssr setup

// Client-side Supabase client (Auth Helper) - Singleton Pattern
// DEPRECATED: `getBrowserSupabaseClient` from `lib/supabase/client.ts` (using @supabase/ssr) should be used instead.
// Cette section est commentée car dépréciée. Si vous en avez besoin, assurez-vous que les variables sont chargées.
// import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
// let browserSupabaseClientLegacy: ReturnType<typeof createPagesBrowserClient> | null = null;
// export const getBrowserSupabaseClient_Legacy = (): SupabaseClient<any, "public", any> => {
//   logger.warn("[SupabaseClient] getBrowserSupabaseClient_Legacy is DEPRECATED. Use getBrowserSupabaseClient from 'lib/supabase/client'.");
//   if (!browserSupabaseClientLegacy) {
//     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; // Lire directement
//     const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Lire directement
//     if (!supabaseUrl || !supabaseAnonKey) {
//       logger.error("CRITICAL: Supabase URL or Anon Key is missing in process.env for legacy browser client.");
//       throw new Error("Supabase URL or Anon Key is missing for legacy browser client.");
//     }
//     browserSupabaseClientLegacy = createPagesBrowserClient({
//       supabaseUrl: supabaseUrl,
//       supabaseKey: supabaseAnonKey,
//     });
//     logger.info("[SupabaseClient] Legacy Browser (Auth Helper) client initialized.");
//   }
//   return browserSupabaseClientLegacy as unknown as SupabaseClient<any, "public", any>;
// };

// Direct Supabase Client (Public - for non-auth-dependent public data access)
let supabaseInstancePublic: SupabaseClient | null = null;
export const getSupabasePublicClient = (): SupabaseClient => {
  if (!supabaseInstancePublic) {
    // Assurer que appConfig et appConfig.vectorStore sont chargés
    if (!appConfig || !appConfig.vectorStore) {
      logger.error(
        "CRITICAL: appConfig or appConfig.vectorStore is undefined. Configuration loading issue for public client."
      );
      throw new Error(
        "Configuration not loaded correctly for Supabase public client."
      );
    }

    const supabaseUrl = appConfig.vectorStore.url; // Provient de NEXT_PUBLIC_SUPABASE_URL via la config
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Lire directement pour le client public

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error(
        "CRITICAL: Supabase URL or Public Anon Key is missing for public client."
      );
      logger.debug(
        `[Debug] Supabase URL from appConfig.vectorStore.url: ${supabaseUrl}`
      );
      logger.debug(
        `[Debug] Supabase Anon Key from process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey}`
      );
      throw new Error(
        "Supabase URL or Public Anon Key is missing for public client."
      );
    }
    supabaseInstancePublic = createSupabaseClientGeneric(
      supabaseUrl,
      supabaseAnonKey
    );
    logger.info("[SupabaseClient] Public (Direct) client initialized.");
  }
  return supabaseInstancePublic;
};
// Export for legacy direct usage if any, but prefer class methods or specific clients.
export const supabase = getSupabasePublicClient();

// The server-side admin client (`supabaseAdmin`) is now consistently imported and used via `getSupabaseAdminClient()`
// from `lib/supabase/server.ts`. No need to redefine it here.

// --- Database Helper Class (using frameworkConfig for table names) ---
// Utilisation de appConfig ici car c'est la configuration unifiée réexportée.
const {
  userProfilesTableName,
  userStatesTableName,
  personasTableName,
  userPersonasTableName,
  userIntegrationsTableName,
  userPushSubscriptionsTableName,
} = appConfig.vectorStore; // appConfig est la config unifiée

export class supabaseAdmin {
  // Remove these static placeholders as they're not properly implemented
  // Instead, we'll use the actual client methods
  
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const logPrefix = "[SupabaseDB:getUserProfile]";
    if (!userId) {
      logger.warn(`${logPrefix} No userId provided.`);
      return null;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return null;
    }
    logger.debug(
      `${logPrefix} Fetching profile for user ${userId.substring(
        0,
        8
      )}... from ${userProfilesTableName}`
    );
    const { data, error } = await client
      .from(userProfilesTableName)
      .select("id, email, full_name, first_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      logger.error(
        `${logPrefix} Error fetching profile for ${userId.substring(0, 8)}:`,
        error.message
      );
    }
    return data as UserProfile | null;
  }

  static async upsertUserProfile(
    userId: string,
    profileData: Partial<Omit<UserProfile, "id">>
  ): Promise<UserProfile | null> {
    const logPrefix = "[SupabaseDB:upsertUserProfile]";
    if (!userId) {
      logger.warn(`${logPrefix} No userId provided.`);
      return null;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return null;
    }

    if (Object.keys(profileData).length === 0) {
      logger.info(
        `${logPrefix} No fields to update for user ${userId.substring(
          0,
          8
        )}. Fetching current.`
      );
      return this.getUserProfile(userId);
    }
    logger.debug(
      `${logPrefix} Upserting profile for user ${userId.substring(
        0,
        8
      )} in ${userProfilesTableName} with keys: ${Object.keys(profileData).join(
        ", "
      )}`
    );
    const { data, error } = await client
      .from(userProfilesTableName)
      .upsert({ id: userId, ...profileData }, { onConflict: "id" })
      .select("id, email, full_name, first_name, avatar_url")
      .single();
    if (error) {
      logger.error(
        `${logPrefix} Error upserting profile for ${userId.substring(0, 8)}:`,
        error.message
      );
      return null;
    }
    logger.debug(
      `${logPrefix} Profile upserted successfully for user ${userId.substring(
        0,
        8
      )}.`
    );
    return data as UserProfile | null;
  }

  static async getUserState(userId: string): Promise<UserState | null> {
    const logPrefix = "[SupabaseDB:getUserState]";
    if (!userId) {
      logger.warn(`${logPrefix} No userId provided.`);
      return null;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return null;
    }
    logger.debug(
      `${logPrefix} Fetching state for user ${userId.substring(
        0,
        8
      )}... from ${userStatesTableName}`
    );
    // Le type UserState dans index.d.ts n'a pas de 'push_subscriptions'.
    // Il faut vérifier la définition de UserState. Si 'push_subscriptions' n'en fait pas partie,
    // le select("*") et le parsing conditionnel pourraient être problématiques ou inutiles.
    // Pour l'instant, je vais supposer que UserState *devrait* l'avoir ou que la DB a une colonne supplémentaire.
    const { data, error } = await client
      .from(userStatesTableName)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      logger.error(
        `${logPrefix} Error fetching user state for ${userId.substring(0, 8)}:`,
        error.message
      );
      return null;
    }
    if (!data) {
      logger.debug(
        `${logPrefix} No state record found for user ${userId.substring(0, 8)}.`
      );
      return null;
    }

    // Le type UserState actuel ne contient pas `push_subscriptions`.
    // Si la table DB a cette colonne et que tu veux la manipuler, UserState doit être mis à jour.
    // Par exemple, si UserState devrait avoir `push_subscriptions?: UserPushSubscription[] | string | null;`
    // if (data.push_subscriptions && typeof data.push_subscriptions === "string") {
    //   try {
    //     const parsedSubs = JSON.parse(data.push_subscriptions);
    //     data.push_subscriptions = Array.isArray(parsedSubs) ? parsedSubs : [];
    //   } catch (parseError: any) {
    //     logger.warn(`${logPrefix} Error parsing push_subscriptions JSON for user ${userId.substring(0,8)}. Defaulting to empty array. Error:`, parseError.message);
    //     data.push_subscriptions = [];
    //   }
    // } else if (data.hasOwnProperty("push_subscriptions") && !Array.isArray(data.push_subscriptions) && data.push_subscriptions !== null) {
    //   logger.warn(`${logPrefix} push_subscriptions is not an array or null for user ${userId.substring(0,8)}. Defaulting to empty array.`);
    //   data.push_subscriptions = [];
    // } else if (!data.hasOwnProperty("push_subscriptions") || data.push_subscriptions === null) {
    //   // data.push_subscriptions = []; // Déjà typé comme optionnel, donc cette initialisation n'est peut-être pas nécessaire si elle est gérée par le type.
    // }
    return data as UserState | null;
  }

  static async updateState(
    userId: string,
    updates: Partial<UserState>
  ): Promise<boolean> {
    const logPrefix = "[SupabaseDB:updateState]";
    if (!userId) {
      logger.warn(`${logPrefix} No userId provided.`);
      return false;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return false;
    }

    const safeUpdates: Record<string, any> = {};
    for (const key in updates) {
      if (key === "user_id") continue;
      const value = updates[key as keyof UserState];

      // Le type UserState n'a pas 'push_subscriptions'. Si c'est une colonne spéciale dans la table 'user_states'
      // mais pas dans le type UserState, cette logique doit être revue.
      // if (key === "push_subscriptions") {
      //   if (value === undefined) continue;
      //   else if (value === null) safeUpdates.push_subscriptions = null;
      //   else if (Array.isArray(value) && value.every(
      //       (sub: any): sub is UserPushSubscription =>
      //         sub && typeof sub.endpoint === "string" && sub.keys &&
      //         typeof sub.keys.p256dh === "string" && typeof sub.keys.auth === "string"
      //     )) {
      //     safeUpdates.push_subscriptions = value;
      //   } else {
      //     logger.error(`${logPrefix} Invalid push_subscriptions format provided for user ${userId.substring(0,8)}. Updates:`, value);
      //     return false;
      //   }
      // }
      if (key === "last_interaction_at" && value instanceof Date) {
        safeUpdates.last_interaction_at = value.toISOString();
      } else if (value !== undefined) {
        safeUpdates[key] = value;
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      logger.info(
        `${logPrefix} No valid fields to update for user ${userId.substring(
          0,
          8
        )}. Skipping.`
      );
      return true;
    }
    logger.debug(
      `${logPrefix} Upserting state for user ${userId.substring(
        0,
        8
      )} in ${userStatesTableName} with keys: ${Object.keys(safeUpdates).join(
        ", "
      )}`
    );
    const { error } = await client
      .from(userStatesTableName)
      .upsert({ user_id: userId, ...safeUpdates }, { onConflict: "user_id" })
      .select("user_id");
    if (error) {
      logger.error(
        `${logPrefix} Error updating user state for ${userId.substring(0, 8)}:`,
        error.message
      );
      return false;
    }
    logger.debug(
      `${logPrefix} State updated successfully for user ${userId.substring(
        0,
        8
      )}.`
    );
    return true;
  }

  static async getPersonaById(
    personaId: string
  ): Promise<PredefinedPersona | null> {
    const logPrefix = "[SupabaseDB:getPersonaById]";
    if (!personaId) {
      logger.warn(`${logPrefix} No personaId provided.`);
      return null;
    }
    const client = getSupabasePublicClient(); // Utilise le client public pour les personas publiques
    if (!client) {
      logger.error(`${logPrefix} Supabase public client unavailable.`);
      return null;
    }
    logger.debug(
      `${logPrefix} Fetching predefined persona ${personaId} from ${personasTableName}...`
    );
    const { data, error } = await client
      .from(personasTableName)
      .select("*")
      .eq("id", personaId)
      .eq("is_public", true)
      .maybeSingle();
    if (error) {
      logger.error(
        `${logPrefix} Error fetching predefined persona ${personaId}:`,
        error.message
      );
      return null;
    }
    return data as PredefinedPersona | null;
  }

  static async getUserPersonaById(
    userId: string,
    personaId: string
  ): Promise<UserPersona | null> {
    const logPrefix = "[SupabaseDB:getUserPersonaById]";
    if (!userId || !personaId) {
      logger.warn(`${logPrefix} No userId or personaId provided.`);
      return null;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return null;
    }
    logger.debug(
      `${logPrefix} Fetching user persona ${personaId} for user ${userId.substring(
        0,
        8
      )} from ${userPersonasTableName}...`
    );
    const { data, error } = await client
      .from(userPersonasTableName)
      .select("*")
      .eq("id", personaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      logger.error(
        `${logPrefix} Error fetching user persona ${personaId} for user ${userId.substring(
          0,
          8
        )}:`,
        error.message
      );
      return null;
    }
    return data as UserPersona | null;
  }

  static async getAllPredefinedPersonas(): Promise<PredefinedPersona[]> {
    const logPrefix = "[SupabaseDB:getAllPredefinedPersonas]";
    const client = getSupabasePublicClient();
    logger.debug(
      `${logPrefix} Fetching all predefined personas from ${personasTableName}...`
    );
    const { data, error } = await client
      .from(personasTableName)
      .select("*")
      .eq("is_public", true);
    if (error) {
      logger.error(
        `${logPrefix} Error fetching predefined personas: ${error.message}`
      );
      return [];
    }
    return (data || []) as PredefinedPersona[];
  }

  static async getAllUserPersonas(userId: string): Promise<UserPersona[]> {
    const logPrefix = "[SupabaseDB:getAllUserPersonas]";
    if (!userId) {
      logger.warn(`${logPrefix} No userId provided.`);
      return [];
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return [];
    }
    logger.debug(
      `${logPrefix} Fetching all personas for user ${userId.substring(
        0,
        8
      )} from ${userPersonasTableName}...`
    );
    const { data, error } = await client
      .from(userPersonasTableName)
      .select("*")
      .eq("user_id", userId);
    if (error) {
      logger.error(
        `${logPrefix} Error fetching user personas for ${userId.substring(
          0,
          8
        )}: ${error.message}`
      );
      return [];
    }
    return (data || []) as UserPersona[];
  }

  static async createUserPersona(
    userId: string,
    personaData: Omit<
      UserPersona,
      "id" | "user_id" | "created_at" | "updated_at"
    >
  ): Promise<UserPersona | null> {
    const logPrefix = "[SupabaseDB:createUserPersona]";
    if (
      !userId ||
      !personaData.name?.trim() ||
      !personaData.system_prompt?.trim()
    ) {
      logger.error(
        `${logPrefix} Missing required fields (userId, name, system_prompt).`
      );
      return null;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return null;
    }
    logger.info(
      `${logPrefix} Creating persona '${
        personaData.name
      }' for user ${userId.substring(0, 8)} in ${userPersonasTableName}...`
    );
    const { data, error } = await client
      .from(userPersonasTableName)
      .insert({ ...personaData, user_id: userId })
      .select()
      .single();
    if (error) {
      logger.error(`${logPrefix} DB Error creating persona: ${error.message}`);
      return null;
    }
    logger.info(`${logPrefix} Persona created successfully (ID: ${data?.id}).`);
    return data as UserPersona | null;
  }

  static async updateUserPersona(
    userId: string,
    personaId: string,
    updates: Partial<Omit<UserPersona, "id" | "user_id" | "created_at">>
  ): Promise<UserPersona | null> {
    const logPrefix = "[SupabaseDB:updateUserPersona]";
    if (!userId || !personaId || Object.keys(updates).length === 0) {
      logger.warn(`${logPrefix} Missing userId, personaId, or update data.`);
      return null;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return null;
    }
    logger.info(
      `${logPrefix} Updating persona ${personaId} for user ${userId.substring(
        0,
        8
      )} in ${userPersonasTableName}...`
    );
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await client
      .from(userPersonasTableName)
      .update(updatesWithTimestamp)
      .eq("id", personaId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116")
        logger.warn(
          `${logPrefix} Persona ${personaId} not found or not owned by user ${userId.substring(
            0,
            8
          )}.`
        );
      else
        logger.error(
          `${logPrefix} DB Error updating persona: ${error.message}`
        );
      return null;
    }
    logger.info(`${logPrefix} Persona ${personaId} updated successfully.`);
    return data as UserPersona | null;
  }

  static async deleteUserPersona(
    userId: string,
    personaId: string
  ): Promise<boolean> {
    const logPrefix = "[SupabaseDB:deleteUserPersona]";
    if (!userId || !personaId) {
      logger.warn(`${logPrefix} Missing userId or personaId.`);
      return false;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return false;
    }
    logger.warn(
      `${logPrefix} Deleting persona ${personaId} for user ${userId.substring(
        0,
        8
      )} from ${userPersonasTableName}...`
    );
    const { error, count } = await client
      .from(userPersonasTableName)
      .delete({ count: "exact" })
      .eq("id", personaId)
      .eq("user_id", userId);
    if (error) {
      logger.error(`${logPrefix} DB Error deleting persona: ${error.message}`);
      return false;
    }
    if (count === 0)
      logger.warn(
        `${logPrefix} Persona ${personaId} not found or not owned by user ${userId.substring(
          0,
          8
        )}.`
      );
    else logger.info(`${logPrefix} Persona ${personaId} deleted successfully.`);
    return count !== null && count > 0;
  }

  static async incrementStreak(
    userId: string,
    streakType: string
  ): Promise<void> {
    const logPrefix = "[SupabaseDB:incrementStreak]";
    if (!userId || !streakType) {
      logger.warn(`${logPrefix} Missing userId or streakType.`);
      return;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return;
    }
    logger.debug(
      `${logPrefix} Calling RPC 'increment_user_streak' for streak '${streakType}', user ${userId.substring(
        0,
        8
      )}...`
    );
    try {
      const { error } = await client.rpc("increment_user_streak", {
        p_user_id: userId,
        p_streak_type: streakType,
      });
      if (error) {
        logger.error(
          `${logPrefix} Error calling RPC for streak '${streakType}', user ${userId.substring(
            0,
            8
          )}:`,
          error.message
        );
      } else {
        logger.debug(
          `${logPrefix} RPC successful for streak '${streakType}', user ${userId.substring(
            0,
            8
          )}.`
        );
      }
    } catch (e: any) {
      logger.error(
        `${logPrefix} Exception calling RPC for streak '${streakType}', user ${userId.substring(
          0,
          8
        )}:`,
        e.message
      );
    }
  }

  static async savePushSubscription(
    userId: string,
    subscription: UserPushSubscription
  ): Promise<boolean> {
    const logPrefix = "[SupabaseDB:savePushSubscription]";
    if (
      !userId ||
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      logger.warn(
        `${logPrefix} Missing userId or valid subscription object fields.`
      );
      return false;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return false;
    }
    try {
      logger.info(
        `${logPrefix} Upserting push subscription for user ${userId.substring(
          0,
          8
        )} in ${userPushSubscriptionsTableName}, endpoint: ${subscription.endpoint.substring(
          0,
          30
        )}...`
      );
      const { error } = await client
        .from(userPushSubscriptionsTableName)
        .upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            keys_p256dh: subscription.keys.p256dh,
            keys_auth: subscription.keys.auth,
          },
          { onConflict: "endpoint" }
        );
      if (error) {
        logger.error(
          `${logPrefix} Error saving push subscription for user ${userId.substring(
            0,
            8
          )}:`,
          error.message
        );
        return false;
      }
      logger.info(
        `${logPrefix} Push subscription saved successfully for user ${userId.substring(
          0,
          8
        )}.`
      );
      return true;
    } catch (error: any) {
      logger.error(
        `${logPrefix} Exception saving push subscription for user ${userId.substring(
          0,
          8
        )}:`,
        error.message
      );
      return false;
    }
  }

  static async getPushSubscriptions(
    userId: string
  ): Promise<UserPushSubscription[] | null> {
    const logPrefix = "[SupabaseDB:getPushSubscriptions]";
    if (!userId) {
      logger.warn(`${logPrefix} No userId provided.`);
      return null;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return null;
    }
    try {
      logger.debug(
        `${logPrefix} Fetching subscriptions for user ${userId.substring(
          0,
          8
        )} from ${userPushSubscriptionsTableName}...`
      );
      const { data, error } = await client
        .from(userPushSubscriptionsTableName)
        .select("endpoint, keys_p256dh, keys_auth")
        .eq("user_id", userId);
      if (error) {
        logger.error(
          `${logPrefix} Error fetching subscriptions for user ${userId.substring(
            0,
            8
          )}:`,
          error.message
        );
        return null;
      }
      const mappedSubs = (data || []).map((sub: any) => ({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
      }));
      logger.debug(
        `${logPrefix} Found ${
          mappedSubs.length
        } subscriptions for user ${userId.substring(0, 8)}.`
      );
      return mappedSubs;
    } catch (error: any) {
      logger.error(
        `${logPrefix} Exception fetching subscriptions for user ${userId.substring(
          0,
          8
        )}:`,
        error.message
      );
      return null;
    }
  }

  static async deletePushSubscription(
    userId: string,
    endpoint: string
  ): Promise<boolean> {
    const logPrefix = "[SupabaseDB:deletePushSubscription]";
    if (!userId) {
      logger.warn(`${logPrefix} No userId provided.`);
      return false;
    }
    if (!endpoint) {
      logger.warn(`${logPrefix} No endpoint provided.`);
      return false;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return false;
    }
    try {
      logger.info(
        `${logPrefix} Deleting subscription for user ${userId.substring(
          0,
          8
        )} from ${userPushSubscriptionsTableName}, endpoint: ${endpoint.substring(
          0,
          30
        )}...`
      );
      const { error, count } = await client
        .from(userPushSubscriptionsTableName)
        .delete({ count: "exact" })
        .eq("endpoint", endpoint)
        .eq("user_id", userId);
      if (error) {
        logger.error(
          `${logPrefix} Error deleting subscription:`,
          error.message
        );
        return false;
      }
      if (count === 0) {
        logger.warn(
          `${logPrefix} Subscription not found for endpoint ${endpoint.substring(
            0,
            30
          )} belonging to user ${userId.substring(0, 8)}.`
        );
        return false;
      } else {
        logger.info(`${logPrefix} Subscription deleted successfully.`);
        return true;
      }
    } catch (error: any) {
      logger.error(
        `${logPrefix} Exception deleting subscription:`,
        error.message
      );
      return false;
    }
  }

  static async deleteIntegration(
    userId: string,
    provider: "google" | string
  ): Promise<boolean> {
    const logPrefix = "[SupabaseDB:deleteIntegration]";
    if (!userId || !provider) {
      logger.warn(`${logPrefix} Missing userId or provider.`);
      return false;
    }
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`${logPrefix} Admin client unavailable.`);
      return false;
    }
    logger.warn(
      `${logPrefix} Deleting integration for provider ${provider} and user ${userId.substring(
        0,
        8
      )} from ${userIntegrationsTableName}...`
    );
    try {
      const { error, count } = await client
        .from(userIntegrationsTableName)
        .delete({ count: "exact" })
        .eq("user_id", userId)
        .eq("provider", provider);
      if (error) {
        logger.error(
          `${logPrefix} DB Error deleting integration for user ${userId.substring(
            0,
            8
          )}, provider ${provider}: ${error.message}`
        );
        return false;
      }
      if (count === 0)
        logger.warn(
          `${logPrefix} No integration found for provider ${provider} and user ${userId.substring(
            0,
            8
          )}.`
        );
      else
        logger.info(
          `${logPrefix} Integration deleted successfully for user ${userId.substring(
            0,
            8
          )}, provider: ${provider}.`
        );
      return count !== null && count > 0;
    } catch (e: any) {
      logger.error(
        `${logPrefix} Exception deleting integration for user ${userId.substring(
          0,
          8
        )}, provider ${provider}:`,
        e.message,
        e
      );
      return false;
    }
  }

  // Pass-through static methods for common Supabase operations
  static async rpc(functionName: string, params: any): Promise<any> {
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`[SupabaseAdmin:rpc] Admin client unavailable.`);
      throw new Error("Supabase admin client unavailable");
    }
    return client.rpc(functionName, params);
  }
  
  static get storage() {
    const client = getSupabaseAdminClient();
    if (!client) {
      logger.error(`[SupabaseAdmin:storage] Admin client unavailable.`);
      throw new Error("Supabase admin client unavailable");
    }
    return client.storage;
  }
}

export { getSupabaseAdminClient } from "./supabase/server";
