import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const root = join(__dirname, "..", "..");

const migrationFiles = [
  "20260815000000_enable_postgis.sql",
  "20260815000001_create_profiles_role.sql",
  "20260815000002_create_project_proposal_model.sql",
  "20260815000003_create_source_data_release_schemas.sql",
  "20260815000004_create_rule_legal_schemas.sql",
  "20260815000005_create_analysis_snapshot_schemas.sql",
  "20260815000006_fix_terminal_child_concurrency.sql",
  "20260815000007_fix_analysis_project_proposal_binding.sql",
  "20260815000008_create_internal_audit_model.sql",
];

const migrationsSql = migrationFiles.map((file) => {
  const path = join(root, "supabase", "migrations", file);
  return readFileSync(path, "utf-8");
});

async function applyAllMigrations(client: Client) {
  for (const sql of migrationsSql) {
    await client.query(sql);
  }
}

const DB_TEST_ADVISORY_LOCK = 0xdeadbeef;

async function withAdvisoryLock<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query("SELECT pg_advisory_lock($1)", [DB_TEST_ADVISORY_LOCK]);
  try {
    return await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [DB_TEST_ADVISORY_LOCK]);
    } catch {
      await client.query("ROLLBACK");
    }
  }
}

async function cleanStart(client: Client) {
  await client.query("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users");
  await client.query("DROP SCHEMA IF EXISTS public CASCADE");
  await client.query("DROP SCHEMA IF EXISTS geo CASCADE");
  await client.query("DROP SCHEMA IF EXISTS rules CASCADE");
  await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
  await client.query("DROP SCHEMA IF EXISTS private CASCADE");
  await client.query("CREATE SCHEMA public");
  await applyAllMigrations(client);
  await client.query("GRANT USAGE ON SCHEMA public TO anon, authenticated");
  await client.query("GRANT USAGE ON SCHEMA extensions TO authenticated, anon");
}

describe("RLS clean-start database regression (KT-018)", () => {
  let client: Client;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      console.log("Skipping database regression tests: DATABASE_URL not set");
      return;
    }
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  const runTest = DATABASE_URL ? test : test.skip;

  beforeEach(async () => {
    if (!client) return;
    await client.query("BEGIN");
  });

  afterEach(async () => {
    if (!client) return;
    await client.query("ROLLBACK");
  });

  runTest("applies all migrations to a clean database", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    await expect(
      client.query(
        "SELECT nspname FROM pg_namespace WHERE nspname IN ('public', 'geo', 'rules', 'analysis', 'private') ORDER BY nspname"
      )
    ).resolves.toMatchObject({
      rows: expect.arrayContaining([
        expect.objectContaining({ nspname: "public" }),
        expect.objectContaining({ nspname: "geo" }),
        expect.objectContaining({ nspname: "rules" }),
        expect.objectContaining({ nspname: "analysis" }),
        expect.objectContaining({ nspname: "private" }),
      ]),
    });

    const tables = await client.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'analysis', 'rules', 'private', 'geo') ORDER BY table_schema, table_name"
    );
    const tableNames = tables.rows.map((r) => `${r.table_schema}.${r.table_name}`);

    expect(tableNames).toContain("public.profiles");
    expect(tableNames).toContain("public.projects");
    expect(tableNames).toContain("public.project_proposals");
    expect(tableNames).toContain("analysis.analyses");
    expect(tableNames).toContain("analysis.findings");
    expect(tableNames).toContain("analysis.finding_evidence");
    expect(tableNames).toContain("rules.rule_definitions");
    expect(tableNames).toContain("rules.rule_versions");
    expect(tableNames).toContain("private.source_definitions");
    expect(tableNames).toContain("private.data_releases");
    expect(tableNames).toContain("private.audit_log");
  });

  runTest("RLS is enabled on all client-accessible tables", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const rlsTables = await client.query(
      `SELECT relname, relrowsecurity FROM pg_class WHERE relrowsecurity = true AND relkind = 'r' AND relnamespace IN (
         SELECT oid FROM pg_namespace WHERE nspname IN ('public', 'analysis', 'rules', 'private', 'geo')
       ) ORDER BY relname`
    );
    const rlsTableNames = rlsTables.rows.map((r) => r.relname);

    expect(rlsTableNames).toContain("profiles");
    expect(rlsTableNames).toContain("projects");
    expect(rlsTableNames).toContain("project_proposals");
    expect(rlsTableNames).toContain("analyses");
    expect(rlsTableNames).toContain("analysis_source_versions");
    expect(rlsTableNames).toContain("analysis_rule_versions");
    expect(rlsTableNames).toContain("findings");
    expect(rlsTableNames).toContain("finding_evidence");
    expect(rlsTableNames).toContain("audit_log");
    expect(rlsTableNames).toContain("audit_action_codes");
  });

  runTest("RLS policies exist with expected names", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const policies = await client.query(
      `SELECT policyname, tablename, schemaname FROM pg_policies WHERE schemaname IN ('public', 'analysis', 'rules', 'private') ORDER BY policyname`
    );
    const policyNames = policies.rows.map((r) => r.policyname);

    expect(policyNames).toContain("profiles_select_own");
    expect(policyNames).toContain("profiles_update_own");
    expect(policyNames).toContain("projects_select_own");
    expect(policyNames).toContain("projects_insert_own");
    expect(policyNames).toContain("projects_update_own");
    expect(policyNames).toContain("projects_delete_own");
    expect(policyNames).toContain("project_proposals_select_own");
    expect(policyNames).toContain("analyses_select_own");
    expect(policyNames).toContain("findings_select_own");
    expect(policyNames).toContain("audit_log_no_anon");
    expect(policyNames).toContain("audit_log_no_authenticated");
  });

  runTest("unauthenticated users cannot access protected rows", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `rls-test-${userId.slice(0, 8)}@example.com`]
    );

    await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Secret', '12345') RETURNING id`,
      [userId]
    );

    await client.query("SET ROLE anon");
    await client.query("SAVEPOINT anon_select");
    await expect(client.query("SELECT * FROM public.projects")).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT anon_select");
    await client.query("RESET ROLE");
  });

  runTest("anonymous Auth users can access only their own project data", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const anonUserId = crypto.randomUUID();
    const permanentUserId = crypto.randomUUID();

    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, true), ($3, $4, 'authenticated', false, false)`,
      [
        anonUserId,
        `anon-${anonUserId.slice(0, 8)}@example.com`,
        permanentUserId,
        `permanent-${permanentUserId.slice(0, 8)}@example.com`,
      ]
    );

    const permanentProject = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'PermanentProject', '22222') RETURNING id`,
      [permanentUserId]
    );

    await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [permanentProject.rows[0].id]
    );

    await client.query("SET ROLE authenticated");
    await client.query(`SET request.jwt.claims = '${JSON.stringify({ sub: anonUserId })}'`);

    const ownProject = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'AnonProject', '11111') RETURNING id`,
      [anonUserId]
    );
    expect(ownProject.rows).toHaveLength(1);

    await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [ownProject.rows[0].id]
    );

    const ownProjects = await client.query("SELECT * FROM public.projects WHERE user_id = $1", [
      anonUserId,
    ]);
    expect(ownProjects.rows).toHaveLength(1);

    const ownProposals = await client.query(
      `SELECT pp.* FROM public.project_proposals pp JOIN public.projects p ON p.id = pp.project_id WHERE p.user_id = $1`,
      [anonUserId]
    );
    expect(ownProposals.rows).toHaveLength(1);

    const otherProjects = await client.query("SELECT * FROM public.projects WHERE user_id = $1", [
      permanentUserId,
    ]);
    expect(otherProjects.rows).toHaveLength(0);

    await client.query("RESET ROLE");
  });

  runTest("permanent user A cannot access user B project or analysis data", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userIdA = crypto.randomUUID();
    const userIdB = crypto.randomUUID();

    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false), ($3, $4, 'authenticated', false, false)`,
      [
        userIdA,
        `user-a-${userIdA.slice(0, 8)}@example.com`,
        userIdB,
        `user-b-${userIdB.slice(0, 8)}@example.com`,
      ]
    );

    const projectB = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'UserB', '22222') RETURNING id`,
      [userIdB]
    );

    const proposalB = await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [projectB.rows[0].id]
    );

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`isolation-release-${userIdA.slice(0, 8)}`]
    );

    const analysisB = await client.query(
      `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash') RETURNING id`,
      [projectB.rows[0].id, proposalB.rows[0].id, dataRelease.rows[0].id]
    );

    await client.query("SET ROLE authenticated");
    await client.query(`SET request.jwt.claims = '${JSON.stringify({ sub: userIdA })}'`);

    const bProject = await client.query("SELECT * FROM public.projects WHERE user_id = $1", [
      userIdB,
    ]);
    expect(bProject.rows).toHaveLength(0);

    const bAnalysis = await client.query("SELECT * FROM analysis.analyses WHERE id = $1", [
      analysisB.rows[0].id,
    ]);
    expect(bAnalysis.rows).toHaveLength(0);

    await client.query("SAVEPOINT write_project");
    await expect(
      client.query(
        "INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Hacked', '99999') RETURNING id",
        [userIdB]
      )
    ).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT write_project");

    await client.query("SAVEPOINT write_proposal");
    await expect(
      client.query(
        "INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id",
        [projectB.rows[0].id]
      )
    ).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT write_proposal");

    await client.query("SAVEPOINT write_analysis");
    await expect(
      client.query(
        `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')`,
        [projectB.rows[0].id, proposalB.rows[0].id, dataRelease.rows[0].id]
      )
    ).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT write_analysis");

    await client.query("RESET ROLE");
  });

  runTest("internal schemas have no grants to anon or authenticated", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const anonGrants = await client.query(
      `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema IN ('private', 'rules', 'analysis', 'geo') AND grantee = 'anon'`
    );
    expect(anonGrants.rows.length).toBe(0);

    const authenticatedPrivateRulesGrants = await client.query(
      `SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema IN ('private', 'rules') AND grantee = 'authenticated'`
    );
    expect(authenticatedPrivateRulesGrants.rows.length).toBe(0);
  });

  runTest("Data API exposes only public schemas", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const internalUsage = await client.query(
      `SELECT n.nspname FROM pg_namespace n WHERE has_schema_privilege('authenticated', n.oid, 'USAGE') AND n.nspname IN ('private', 'rules', 'geo')`
    );
    expect(internalUsage.rows.length).toBe(0);
  });

  runTest("supabase config.toml Data API schemas exclude internal schemas", async () => {
    const configPath = join(root, "supabase", "config.toml");
    const config = readFileSync(configPath, "utf-8");

    const apiSchemasMatch = config.match(/schemas\s*=\s*\[([^\]]+)\]/s);
    expect(apiSchemasMatch).not.toBeNull();

    const apiSchemas = apiSchemasMatch![1]
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);

    expect(apiSchemas).toEqual(["public", "graphql_public"]);
  });

  runTest("authenticated client cannot perform server/admin-only operations", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    await client.query("SET ROLE service_role");
    const sourceDef = await client.query(
      `INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version) VALUES ($1, 'Test', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1') RETURNING id`,
      ["test.server-path"]
    );
    expect(sourceDef.rows[0].id).toBe("test.server-path");
    await client.query("RESET ROLE");

    await client.query("SET ROLE authenticated");
    await client.query("SAVEPOINT authenticated_insert");
    await expect(
      client.query(
        "INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version) VALUES ($1, 'Test', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1') RETURNING id",
        ["test.authenticated-denied"]
      )
    ).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT authenticated_insert");
    await client.query("RESET ROLE");
  });

  runTest("profiles trigger prevents client role change", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const trigger = await client.query(
      `SELECT tgname FROM pg_trigger WHERE tgname = 'prevent_client_role_change' AND tgrelid = 'public.profiles'::regclass`
    );
    expect(trigger.rows.length).toBe(1);

    const functionExists = await client.query(
      `SELECT proname FROM pg_proc WHERE proname = 'prevent_client_role_change' AND pronamespace = 'public'::regnamespace`
    );
    expect(functionExists.rows.length).toBe(1);
  });

  runTest("projects trigger prevents client user_id change", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const trigger = await client.query(
      `SELECT tgname FROM pg_trigger WHERE tgname = 'prevent_client_user_id_change' AND tgrelid = 'public.projects'::regclass`
    );
    expect(trigger.rows.length).toBe(1);

    const functionExists = await client.query(
      `SELECT proname FROM pg_proc WHERE proname = 'prevent_client_user_id_change' AND pronamespace = 'public'::regnamespace`
    );
    expect(functionExists.rows.length).toBe(1);
  });

  runTest("profiles are created automatically for new auth users", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();

    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `auto-profile-${userId.slice(0, 8)}@example.com`]
    );

    const profile = await client.query("SELECT * FROM public.profiles WHERE id = $1", [userId]);
    expect(profile.rows.length).toBe(1);
    expect(profile.rows[0].role).toBe("user");
  });

  runTest("completed analysis is immutable", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `immutable-${userId.slice(0, 8)}@example.com`]
    );

    const project = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Immutable', '12345') RETURNING id`,
      [userId]
    );

    const proposal = await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`immutable-release-${userId.slice(0, 8)}`]
    );

    const analysis = await client.query(
      `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash') RETURNING id`,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    await client.query(`UPDATE analysis.analyses SET status = 'completed' WHERE id = $1`, [
      analysis.rows[0].id,
    ]);

    await client.query("SAVEPOINT immutability_update");
    await expect(
      client.query(`UPDATE analysis.analyses SET status = 'partial' WHERE id = $1`, [
        analysis.rows[0].id,
      ])
    ).rejects.toThrow("cannot modify completed analysis");
    await client.query("ROLLBACK TO SAVEPOINT immutability_update");

    await client.query("SAVEPOINT immutability_delete");
    await expect(
      client.query(`DELETE FROM analysis.analyses WHERE id = $1`, [analysis.rows[0].id])
    ).rejects.toThrow("cannot delete completed analysis");
    await client.query("ROLLBACK TO SAVEPOINT immutability_delete");
  });

  runTest("rule versions enforce verified/retired immutability", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    await client.query("SET ROLE service_role");

    const ruleDef = await client.query(
      `INSERT INTO rules.rule_definitions (code, title, category, description) VALUES ($1, 'Test Rule', 'test', 'Test') RETURNING id`,
      [`test.rule-${crypto.randomUUID().slice(0, 8)}`]
    );

    const ruleVersion = await client.query(
      `INSERT INTO rules.rule_versions (rule_definition_id, version, implementation_key, status) VALUES ($1, 1, 'impl-1', 'verified') RETURNING id`,
      [ruleDef.rows[0].id]
    );

    await client.query("SAVEPOINT rule_update");
    await expect(
      client.query("UPDATE rules.rule_versions SET status = 'draft' WHERE id = $1", [
        ruleVersion.rows[0].id,
      ])
    ).rejects.toThrow("cannot modify verified rule version");
    await client.query("ROLLBACK TO SAVEPOINT rule_update");

    await client.query("SAVEPOINT rule_delete");
    await expect(
      client.query("DELETE FROM rules.rule_versions WHERE id = $1", [ruleVersion.rows[0].id])
    ).rejects.toThrow("cannot delete verified rule version");
    await client.query("ROLLBACK TO SAVEPOINT rule_delete");

    await client.query("RESET ROLE");
  });

  runTest("analysis child rows are protected for terminal analyses", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `child-protection-${userId.slice(0, 8)}@example.com`]
    );

    const project = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'ChildProtection', '12345') RETURNING id`,
      [userId]
    );

    const proposal = await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`child-protection-${userId.slice(0, 8)}`]
    );

    const analysis = await client.query(
      `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash') RETURNING id`,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    const sourceDef = await client.query(
      `INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version) VALUES ($1, 'Test', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1') RETURNING id`,
      [`test.child-protection-${userId.slice(0, 8)}`]
    );

    const syncRun = await client.query(
      `INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata) VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}') RETURNING id`,
      [sourceDef.rows[0].id]
    );

    const sourceVersion = await client.query(
      `INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, status, retrieved_at, normalizer_version, record_count, validation_summary) VALUES ($1, 'version-1', $2, 'verified', now(), 'v1', 0, '{}') RETURNING id`,
      [sourceDef.rows[0].id, syncRun.rows[0].id]
    );

    await client.query(
      `INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id) VALUES ($1, $2, $3)`,
      [dataRelease.rows[0].id, sourceDef.rows[0].id, sourceVersion.rows[0].id]
    );

    await client.query(
      `INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id) VALUES ($1, $2, $3)`,
      [analysis.rows[0].id, sourceDef.rows[0].id, sourceVersion.rows[0].id]
    );

    await client.query(`UPDATE analysis.analyses SET status = 'completed' WHERE id = $1`, [
      analysis.rows[0].id,
    ]);

    await client.query("SAVEPOINT child_insert");
    await expect(
      client.query(
        `INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id) VALUES ($1, $2, $3)`,
        [analysis.rows[0].id, sourceDef.rows[0].id, sourceVersion.rows[0].id]
      )
    ).rejects.toThrow("cannot insert child rows for terminal analysis");
    await client.query("ROLLBACK TO SAVEPOINT child_insert");

    await client.query("SAVEPOINT child_update");
    await expect(
      client.query(
        `UPDATE analysis.analysis_source_versions SET source_id = $1 WHERE analysis_id = $2 AND source_id = $3`,
        [sourceDef.rows[0].id, analysis.rows[0].id, sourceDef.rows[0].id]
      )
    ).rejects.toThrow("cannot modify child rows of terminal analysis");
    await client.query("ROLLBACK TO SAVEPOINT child_update");

    await client.query("SAVEPOINT child_delete");
    await expect(
      client.query(
        `DELETE FROM analysis.analysis_source_versions WHERE analysis_id = $1 AND source_id = $2`,
        [analysis.rows[0].id, sourceDef.rows[0].id]
      )
    ).rejects.toThrow("cannot delete child rows of terminal analysis");
    await client.query("ROLLBACK TO SAVEPOINT child_delete");
  });

  runTest("audit log is immutable and uses canonical writer", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb) AS id`,
      [
        userId,
        JSON.stringify({
          rule_version_id: crypto.randomUUID(),
          implementation_key: "impl-1",
        }),
      ]
    );

    expect(auditId.rows[0].id).toBeDefined();

    await client.query("SAVEPOINT audit_update");
    await expect(
      client.query("UPDATE private.audit_log SET safe_metadata = '{}' WHERE id = $1", [
        auditId.rows[0].id,
      ])
    ).rejects.toThrow("audit_log is immutable");
    await client.query("ROLLBACK TO SAVEPOINT audit_update");

    await client.query("SAVEPOINT audit_delete");
    await expect(
      client.query("DELETE FROM private.audit_log WHERE id = $1", [auditId.rows[0].id])
    ).rejects.toThrow("audit_log is immutable");
    await client.query("ROLLBACK TO SAVEPOINT audit_delete");
  });

  runTest("analysis provenance validates data release membership", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `provenance-${userId.slice(0, 8)}@example.com`]
    );

    const project = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Provenance', '12345') RETURNING id`,
      [userId]
    );

    const proposal = await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`provenance-release-${userId.slice(0, 8)}`]
    );

    const analysis = await client.query(
      `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash') RETURNING id`,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    const finding = await client.query(
      `INSERT INTO analysis.findings (analysis_id, code, category, state, title_key) VALUES ($1, 'TEST', 'test', 'clear', 'test.key') RETURNING id`,
      [analysis.rows[0].id]
    );

    const sourceDefA = await client.query(`
      INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version)
      VALUES ('test.source-a', 'Test A', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1')
      RETURNING id
    `);

    const sourceDefB = await client.query(`
      INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version)
      VALUES ('test.source-b', 'Test B', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1')
      RETURNING id
    `);

    const syncRunA = await client.query(
      `INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata) VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}') RETURNING id`,
      [sourceDefA.rows[0].id]
    );

    const syncRunB = await client.query(
      `INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata) VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}') RETURNING id`,
      [sourceDefB.rows[0].id]
    );

    const versionA = await client.query(
      `INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, status, retrieved_at, normalizer_version, record_count, validation_summary) VALUES ($1, 'version-a', $2, 'verified', now(), 'v1', 0, '{}') RETURNING id`,
      [sourceDefA.rows[0].id, syncRunA.rows[0].id]
    );

    const versionB = await client.query(
      `INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, status, retrieved_at, normalizer_version, record_count, validation_summary) VALUES ($1, 'version-b', $2, 'verified', now(), 'v1', 0, '{}') RETURNING id`,
      [sourceDefB.rows[0].id, syncRunB.rows[0].id]
    );

    await client.query(
      `INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id) VALUES ($1, $2, $3)`,
      [dataRelease.rows[0].id, sourceDefA.rows[0].id, versionA.rows[0].id]
    );

    await client.query(
      `INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id) VALUES ($1, $2, $3)`,
      [dataRelease.rows[0].id, sourceDefB.rows[0].id, versionB.rows[0].id]
    );

    await expect(
      client.query(
        `INSERT INTO analysis.finding_evidence (finding_id, evidence_type, source_sync_run_id, source_dataset_version_id) VALUES ($1, 'source', $2, $3)`,
        [finding.rows[0].id, syncRunA.rows[0].id, versionB.rows[0].id]
      )
    ).rejects.toThrow("was not produced by sync run");
  });

  runTest("rejects mismatched project and proposal", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `binding-${userId.slice(0, 8)}@example.com`]
    );

    const projectA = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Project A', '12345') RETURNING id`,
      [userId]
    );

    const projectB = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Project B', '67890') RETURNING id`,
      [userId]
    );

    const proposalInB = await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [projectB.rows[0].id]
    );

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`binding-release-${userId.slice(0, 8)}`]
    );

    await expect(
      client.query(
        `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')`,
        [projectA.rows[0].id, proposalInB.rows[0].id, dataRelease.rows[0].id]
      )
    ).rejects.toThrow();
  });
});
