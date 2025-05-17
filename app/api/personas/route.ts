// FILE: app/api/personas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { UserPersona, PredefinedPersona } from "@/lib/types"; // S'assurer que PredefinedPersona est aussi importé si nécessaire
import { logger } from "@/memory-framework/config";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // Importer le client Supabase pour Route Handlers
import { cookies } from "next/headers";

// Plus besoin de la fonction getUserIdFromRequest basée sur les headers

// GET: List predefined and user personas
export async function GET(req: NextRequest) {
  const logPrefix = "[API Personas GET]";
  let userId: string | null = null;
  const cookieStore = cookies();

  try {
    const supabase = await createServerSupabaseClient(); // Utiliser le client Supabase pour les Route Handlers
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      logger.error(
        `${logPrefix} Auth] Supabase getUser() error:`,
        userError.message
      );
    }
    if (!user) {
      logger.warn(
        `${logPrefix} Auth] No active Supabase user found via getUser().`
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    logger.info(
      `${logPrefix} Request received from user: ${userId!.substring(0, 8)}...`
    );
  } catch (authError: any) {
    logger.error(
      `${logPrefix} Auth Exception:`,
      authError.message,
      authError.stack
    );
    return NextResponse.json(
      { error: "Authentication process error" },
      { status: 500 }
    );
  }

  try {
    logger.info(
      `${logPrefix} Fetching personas for user ${userId!.substring(0, 8)}`
    );
    const [predefinedPersonas, userPersonas] = await Promise.all([
      supabaseAdmin.getAllPredefinedPersonas(),
      supabaseAdmin.getAllUserPersonas(userId!), // userId est garanti non-null ici
    ]);
    logger.info(
      `${logPrefix} Found ${predefinedPersonas.length} predefined, ${
        userPersonas.length
      } user personas for user ${userId!.substring(0, 8)}.`
    );
    // Types de retour : s'assurer qu'ils correspondent à ce que le client attend
    const responsePayload: {
      predefined: PredefinedPersona[];
      user: UserPersona[];
    } = {
      predefined: predefinedPersonas as PredefinedPersona[], // Cast si SupabaseDB retourne un type plus générique
      user: userPersonas as UserPersona[],
    };
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error fetching personas for user ${userId!.substring(
        0,
        8
      )}:`,
      error.message,
      error.stack
    );
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message}` },
      { status: 500 }
    );
  }
}

// POST: Create a new user persona
export async function POST(req: NextRequest) {
  const logPrefix = "[API Personas POST]";
  let userId: string | null = null;
  const cookieStore = cookies();

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError)
      logger.error(
        `${logPrefix} Auth] Supabase getUser() error:`,
        userError.message
      );
    if (!user) {
      logger.warn(
        `${logPrefix} Auth] No active Supabase user found via getUser().`
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    logger.info(
      `${logPrefix} Create request received from user: ${userId!.substring(
        0,
        8
      )}...`
    );
  } catch (authError: any) {
    logger.error(
      `${logPrefix} Auth Exception:`,
      authError.message,
      authError.stack
    );
    return NextResponse.json(
      { error: "Authentication process error" },
      { status: 500 }
    );
  }

  let personaDataToCreate: Omit<
    UserPersona,
    "id" | "user_id" | "created_at" | "updated_at"
  >;

  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      throw new Error("Missing or invalid 'name' field.");
    }
    if (
      !body.system_prompt ||
      typeof body.system_prompt !== "string" ||
      !body.system_prompt.trim()
    ) {
      throw new Error("Missing or invalid 'system_prompt' field.");
    }

    personaDataToCreate = {
      name: body.name.trim().substring(0, 100),
      description:
        typeof body.description === "string"
          ? body.description.trim().substring(0, 255)
          : null,
      system_prompt: body.system_prompt.trim(),
      voice_id:
        typeof body.voice_id === "string" && body.voice_id.trim()
          ? body.voice_id.trim()
          : null,
    };
    logger.info(
      `${logPrefix} Received request to create persona "${
        personaDataToCreate.name
      }" for user ${userId!.substring(0, 8)}`
    );
  } catch (e: any) {
    logger.error(
      `${logPrefix} Invalid request body for user ${userId!.substring(0, 8)}:`,
      e.message
    );
    return NextResponse.json(
      { error: `Invalid request body: ${e.message}` },
      { status: 400 }
    );
  }

  try {
    const newPersona = await supabaseAdmin.createUserPersona(
      userId!,
      personaDataToCreate
    ); // userId est garanti non-null
    if (!newPersona) {
      // SupabaseDB.createUserPersona devrait lancer une erreur ou retourner null en cas d'échec DB.
      // Si elle retourne null, il faut gérer cela comme une erreur ici.
      logger.error(
        `${logPrefix} SupabaseDB.createUserPersona returned null/undefined for user ${userId!.substring(
          0,
          8
        )}.`
      );
      throw new Error(
        "Failed to create persona in database (operation returned no data)."
      );
    }
    logger.info(
      `${logPrefix} Persona created successfully (ID: ${
        newPersona.id
      }) for user ${userId!.substring(0, 8)}.`
    );
    return NextResponse.json(newPersona as UserPersona, { status: 201 }); // Cast si nécessaire
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error creating persona for user ${userId!.substring(0, 8)}:`,
      error.message,
      error.stack
    );
    const clientError = error.message.includes(
      "duplicate key value violates unique constraint"
    )
      ? "A persona with this name already exists."
      : `Internal Server Error while creating persona: ${error.message.substring(
          0,
          100
        )}`;
    const status = error.message.includes(
      "duplicate key value violates unique constraint"
    )
      ? 409
      : 500;
    return NextResponse.json({ error: clientError }, { status: status });
  }
}
