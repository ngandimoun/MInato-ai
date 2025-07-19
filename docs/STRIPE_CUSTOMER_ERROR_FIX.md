# Stripe Customer Database Error Fix

## Issue

When new users attempt to connect to Minato, the following error is encountered:

```
[MINATO-INFO] [SupabaseClient] Browser Supabase client initialized.
GET /?error=server_error&error_description=Database+error+saving+new+user 200 in 13169ms
✓ Compiled in 1852ms (1334 modules)
GET /?error=server_error&error_description=Database+error+saving+new+user 200 in 53ms
✓ Compiled /middleware in 423ms (225 modules
```

The root cause of this issue is in the database, specifically:

```
ERROR: type "plan_type_enum" does not exist (SQLSTATE 42704)
```

## Cause

The `handle_new_user` trigger function attempts to use the `plan_type_enum` type when creating a new user profile, but this type does not exist in the database. This happens because:

1. The `plan_type_enum` type was defined in a migration (`add_plan_type_enum_and_subscription_fields`), but it may not have been properly applied in all environments.
2. The `handle_new_user` function references this type when inserting new records into the `user_profiles` table.

## Solution

A fix has been implemented with the following steps:

1. Created a migration to ensure the `plan_type_enum` type exists:
   ```sql
   DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type_enum') THEN
       CREATE TYPE plan_type_enum AS ENUM ('FREE_TRIAL', 'PRO', 'EXPIRED');
     END IF;
   END$$;
   ```

2. Updated the `handle_new_user` function to handle the case where the enum might not exist:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS trigger
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $function$
   BEGIN
     -- Function implementation with proper enum handling
     -- ...
   END;
   $function$;
   ```

3. Created a script (`scripts/fix-stripe-webhooks.js`) that can be run to apply these fixes programmatically.

## How to Apply the Fix

### Option 1: Run the Migration Directly

```bash
# Connect to your Supabase project and run:
npm run supabase:migration -- fix_plan_type_enum_issue_complete
```

### Option 2: Run the Fix Script

```bash
# Make sure you have the correct environment variables set
# NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
node scripts/fix-stripe-webhooks.js
```

## Verification

After applying the fix, new users should be able to connect to Minato without encountering the database error. You can verify this by:

1. Creating a new test user
2. Checking the logs for any errors
3. Confirming that a record was created in the `user_profiles` table with the correct `plan_type` value

## Prevention

To prevent similar issues in the future:

1. Always ensure that database types are created before they are referenced in functions or tables
2. Add conditional type creation in migrations (using `IF NOT EXISTS`)
3. Consider adding a database schema validation step to your CI/CD pipeline
4. Regularly test user registration flows in all environments 