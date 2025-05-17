// FILE: app/api/personas/[personaId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { UserPersona } from "@/lib/types";
import { logger } from "@/memory-framework/config";
import { createServerSupabaseClient } from "@/lib/supabase/server"; // Importer le client Supabase pour Route Handlers
import { cookies } from "next/headers";

// Plus besoin de la fonction getUserIdFromRequest basée sur les headers

interface RouteParams {
  params: { personaId: string };
}

// PUT: Update an existing user persona
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const logPrefix = "[API Personas/[id] PUT]";
  const { personaId } = params;
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

  if (!personaId) {
    logger.warn(
      `${logPrefix} Missing personaId parameter for user ${userId!.substring(
        0,
        8
      )}`
    );
    return NextResponse.json(
      { error: "Missing personaId parameter" },
      { status: 400 }
    );
  }
  logger.info(
    `${logPrefix} Update request for persona ${personaId} from user: ${userId!.substring(
      0,
      8
    )}...`
  );

  let updates: Partial<
    Omit<UserPersona, "id" | "user_id" | "created_at" | "updated_at">
  >;
  try {
    const body = await req.json();
    updates = {};
    if (
      body.hasOwnProperty("name") &&
      typeof body.name === "string" &&
      body.name.trim()
    )
      updates.name = body.name.trim().substring(0, 100);
    if (body.hasOwnProperty("description"))
      updates.description =
        typeof body.description === "string"
          ? body.description.trim().substring(0, 255)
          : null;
    if (
      body.hasOwnProperty("system_prompt") &&
      typeof body.system_prompt === "string" &&
      body.system_prompt.trim()
    )
      updates.system_prompt = body.system_prompt.trim();
    if (body.hasOwnProperty("voice_id"))
      updates.voice_id =
        typeof body.voice_id === "string" && body.voice_id.trim()
          ? body.voice_id.trim()
          : null;

    if (Object.keys(updates).length === 0) {
      logger.warn(
        `${logPrefix} No valid fields provided for update on persona ${personaId} by user ${userId!.substring(
          0,
          8
        )}.`
      );
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }
    logger.info(
      `${logPrefix} Updating persona ${personaId} for user ${userId!.substring(
        0,
        8
      )} with keys: ${Object.keys(updates).join(", ")}`
    );
  } catch (e: any) {
    logger.error(
      `${logPrefix} Invalid request body for user ${userId!.substring(
        0,
        8
      )} updating persona ${personaId}:`,
      e.message
    );
    return NextResponse.json(
      { error: `Invalid request body: ${e.message}` },
      { status: 400 }
    );
  }

  try {
    const updatedPersona = await supabaseAdmin.updateUserPersona(
      userId!,
      personaId,
      updates
    ); // userId est garanti non-null
    if (!updatedPersona) {
      logger.warn(
        `${logPrefix} Persona ${personaId} not found or user ${userId!.substring(
          0,
          8
        )} not authorized to update. SupabaseDB.updateUserPersona returned null/undefined.`
      );
      return NextResponse.json(
        {
          error:
            "Persona not found or update failed (authorization or existence).",
        },
        { status: 404 }
      );
    }
    logger.info(
      `${logPrefix} Persona ${personaId} updated successfully for user ${userId!.substring(
        0,
        8
      )}.`
    );
    return NextResponse.json(updatedPersona as UserPersona); // Cast si nécessaire
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error updating persona ${personaId} for user ${userId!.substring(
        0,
        8
      )}:`,
      error.message,
      error.stack
    );
    const clientError = error.message.includes(
      "duplicate key value violates unique constraint"
    )
      ? "A persona with this name already exists."
      : `Internal Server Error while updating persona: ${error.message.substring(
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

// DELETE: Delete a user persona
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const logPrefix = "[API Personas/[id] DELETE]";
  const { personaId } = params;
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

  if (!personaId) {
    logger.warn(
      `${logPrefix} Missing personaId parameter for user ${userId!.substring(
        0,
        8
      )}`
    );
    return NextResponse.json(
      { error: "Missing personaId parameter" },
      { status: 400 }
    );
  }
  logger.warn(
    `${logPrefix} Received request to DELETE persona ${personaId} for user ${userId!.substring(
      0,
      8
    )}.`
  );

  try {
    const success = await supabaseAdmin.deleteUserPersona(userId!, personaId); // userId est garanti non-null
    if (success) {
      logger.info(
        `${logPrefix} Persona ${personaId} deleted successfully for user ${userId!.substring(
          0,
          8
        )}.`
      );
      return new NextResponse(null, { status: 204 }); // Success, No Content
    } else {
      logger.warn(
        `${logPrefix} Persona ${personaId} not found or user ${userId!.substring(
          0,
          8
        )} not authorized to delete. SupabaseDB.deleteUserPersona returned false.`
      );
      return NextResponse.json(
        {
          error:
            "Persona not found or delete failed (authorization or existence).",
        },
        { status: 404 }
      );
    }
  } catch (error: any) {
    logger.error(
      `${logPrefix} Error deleting persona ${personaId} for user ${userId!.substring(
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
