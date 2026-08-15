import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000005_create_analysis_snapshot_schemas.sql"
);

const migrationSql = readFileSync(migrationPath, "utf-8");

describe("analysis snapshot database regression (KT-016)", () => {
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

  runTest("applies migration to a clean database", async () => {
    await client.query(migrationSql);
    const result = await client.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'analysis'"
    );
    expect(result.rows[0].count).toBe(5);
  });

  runTest("rejects source version not in parent analysis data release", async () => {
    await client.query(migrationSql);

    await client.query(`
      INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'user')
      ON CONFLICT DO NOTHING
    `);

    const user = await client.query("SELECT id FROM public.profiles LIMIT 1");
    const userId = user.rows[0]?.id || crypto.randomUUID();

    await client.query(
      `
      INSERT INTO auth.users (id, email, role) VALUES ($1, 'test@example.com', 'authenticated')
      ON CONFLICT DO NOTHING
    `,
      [userId]
    );

    const project = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Test', '12345')
      RETURNING id
    `,
      [userId]
    );

    const proposal = await client.query(
      `
      INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release', 'promoted')
      RETURNING id
    `);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    const sourceDef = await client.query(`
      INSERT INTO private.source_definitions (id, name, authority, source_type, refresh_policy, verification_policy)
      VALUES ('test.source', 'Test', 'Test', 'WFS', 'monthly_snapshot', 'automatic_quality_gates')
      RETURNING id
    `);

    const otherRelease = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('other-release', 'promoted')
      RETURNING id
    `);

    const otherVersion = await client.query(
      `
      INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, record_count)
      VALUES ($1, 'other-version', gen_random_uuid(), 0)
      RETURNING id
    `,
      [sourceDef.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [otherRelease.rows[0].id, sourceDef.rows[0].id, otherVersion.rows[0].id]
    );

    await expect(
      client.query(
        `
        INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
        VALUES ($1, $2, $3)
      `,
        [analysis.rows[0].id, sourceDef.rows[0].id, otherVersion.rows[0].id]
      )
    ).rejects.toThrow("source version");
  });

  runTest("rejects finding rule_version_id not in analysis_rule_versions", async () => {
    await client.query(migrationSql);

    await client.query(`
      INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'user')
      ON CONFLICT DO NOTHING
    `);

    const user = await client.query("SELECT id FROM public.profiles LIMIT 1");
    const userId = user.rows[0]?.id || crypto.randomUUID();

    await client.query(
      `
      INSERT INTO auth.users (id, email, role) VALUES ($1, 'test@example.com', 'authenticated')
      ON CONFLICT DO NOTHING
    `,
      [userId]
    );

    const project = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Test', '12345')
      RETURNING id
    `,
      [userId]
    );

    const proposal = await client.query(
      `
      INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release', 'promoted')
      RETURNING id
    `);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    const ruleDef = await client.query(`
      INSERT INTO rules.rule_definitions (code, title, category, description)
      VALUES ('TEST_RULE', 'Test', 'test', 'Test')
      RETURNING id
    `);

    const ruleVersion = await client.query(
      `
      INSERT INTO rules.rule_versions (rule_definition_id, version, implementation_key, status)
      VALUES ($1, 1, 'test', 'verified')
      RETURNING id
    `,
      [ruleDef.rows[0].id]
    );

    const otherRuleVersion = await client.query(
      `
      INSERT INTO rules.rule_versions (rule_definition_id, version, implementation_key, status)
      VALUES ($1, 2, 'test', 'verified')
      RETURNING id
    `,
      [ruleDef.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO analysis.analysis_rule_versions (analysis_id, rule_version_id)
      VALUES ($1, $2)
    `,
      [analysis.rows[0].id, ruleVersion.rows[0].id]
    );

    await expect(
      client.query(
        `
        INSERT INTO analysis.findings (analysis_id, rule_version_id, code, category, state, title_key)
        VALUES ($1, $2, 'TEST', 'test', 'clear', 'test.key')
      `,
        [analysis.rows[0].id, otherRuleVersion.rows[0].id]
      )
    ).rejects.toThrow("violates foreign key constraint");
  });

  runTest("prevents child mutation after parent analysis reaches terminal state", async () => {
    await client.query(migrationSql);

    await client.query(`
      INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'user')
      ON CONFLICT DO NOTHING
    `);

    const user = await client.query("SELECT id FROM public.profiles LIMIT 1");
    const userId = user.rows[0]?.id || crypto.randomUUID();

    await client.query(
      `
      INSERT INTO auth.users (id, email, role) VALUES ($1, 'test@example.com', 'authenticated')
      ON CONFLICT DO NOTHING
    `,
      [userId]
    );

    const project = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Test', '12345')
      RETURNING id
    `,
      [userId]
    );

    const proposal = await client.query(
      `
      INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release', 'promoted')
      RETURNING id
    `);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    await client.query(
      `
      UPDATE analysis.analyses SET status = 'completed' WHERE id = $1
    `,
      [analysis.rows[0].id]
    );

    await expect(
      client.query(
        `
        INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
        VALUES ($1, 'test', gen_random_uuid())
      `,
        [analysis.rows[0].id]
      )
    ).rejects.toThrow("cannot insert child rows for terminal analysis");

    await expect(
      client.query(
        `
        UPDATE analysis.analysis_source_versions SET source_id = 'other' WHERE analysis_id = $1
      `,
        [analysis.rows[0].id]
      )
    ).rejects.toThrow("cannot modify child rows of terminal analysis");
  });

  runTest("prevents moving child rows away from terminal analysis", async () => {
    await client.query(migrationSql);

    await client.query(`
      INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'user')
      ON CONFLICT DO NOTHING
    `);

    const user = await client.query("SELECT id FROM public.profiles LIMIT 1");
    const userId = user.rows[0]?.id || crypto.randomUUID();

    await client.query(
      `
      INSERT INTO auth.users (id, email, role) VALUES ($1, 'test@example.com', 'authenticated')
      ON CONFLICT DO NOTHING
    `,
      [userId]
    );

    const project = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Test', '12345')
      RETURNING id
    `,
      [userId]
    );

    const proposal = await client.query(
      `
      INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease1 = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('release-1', 'promoted')
      RETURNING id
    `);

    const dataRelease2 = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('release-2', 'promoted')
      RETURNING id
    `);

    const analysis1 = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, dataRelease1.rows[0].id]
    );

    const analysis2 = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, dataRelease2.rows[0].id]
    );

    await client.query(
      `
      UPDATE analysis.analyses SET status = 'completed' WHERE id = $1
    `,
      [analysis1.rows[0].id]
    );

    const sourceVersion = await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, 'test', gen_random_uuid())
      RETURNING id
    `,
      [analysis1.rows[0].id]
    );

    await expect(
      client.query(
        `
        UPDATE analysis.analysis_source_versions SET analysis_id = $1 WHERE id = $2
      `,
        [analysis2.rows[0].id, sourceVersion.rows[0].id]
      )
    ).rejects.toThrow("cannot modify child rows of terminal analysis");
  });

  runTest("allows normal child insert/delete on non-terminal analysis", async () => {
    await client.query(migrationSql);

    await client.query(`
      INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'user')
      ON CONFLICT DO NOTHING
    `);

    const user = await client.query("SELECT id FROM public.profiles LIMIT 1");
    const userId = user.rows[0]?.id || crypto.randomUUID();

    await client.query(
      `
      INSERT INTO auth.users (id, email, role) VALUES ($1, 'test@example.com', 'authenticated')
      ON CONFLICT DO NOTHING
    `,
      [userId]
    );

    const project = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Test', '12345')
      RETURNING id
    `,
      [userId]
    );

    const proposal = await client.query(
      `
      INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release', 'promoted')
      RETURNING id
    `);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    const sourceVersion = await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, 'test', gen_random_uuid())
      RETURNING id
    `,
      [analysis.rows[0].id]
    );

    await client.query(
      `
      UPDATE analysis.analysis_source_versions SET source_id = 'other' WHERE id = $1
    `,
      [sourceVersion.rows[0].id]
    );

    await client.query(
      `
      DELETE FROM analysis.analysis_source_versions WHERE id = $1
    `,
      [sourceVersion.rows[0].id]
    );
  });

  runTest("rejects mismatched evidence source sync run and dataset version", async () => {
    await client.query(migrationSql);

    await client.query(`
      INSERT INTO public.profiles (id, role) VALUES (gen_random_uuid(), 'user')
      ON CONFLICT DO NOTHING
    `);

    const user = await client.query("SELECT id FROM public.profiles LIMIT 1");
    const userId = user.rows[0]?.id || crypto.randomUUID();

    await client.query(
      `
      INSERT INTO auth.users (id, email, role) VALUES ($1, 'test@example.com', 'authenticated')
      ON CONFLICT DO NOTHING
    `,
      [userId]
    );

    const project = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Test', '12345')
      RETURNING id
    `,
      [userId]
    );

    const proposal = await client.query(
      `
      INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(`
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release', 'promoted')
      RETURNING id
    `);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, gen_random_uuid(), $3, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, dataRelease.rows[0].id]
    );

    const finding = await client.query(
      `
      INSERT INTO analysis.findings (analysis_id, code, category, state, title_key)
      VALUES ($1, 'TEST', 'test', 'clear', 'test.key')
      RETURNING id
    `,
      [analysis.rows[0].id]
    );

    const sourceDef = await client.query(`
      INSERT INTO private.source_definitions (id, name, authority, source_type, refresh_policy, verification_policy)
      VALUES ('test.source', 'Test', 'Test', 'WFS', 'monthly_snapshot', 'automatic_quality_gates')
      RETURNING id
    `);

    const syncRunA = await client.query(
      `
      INSERT INTO private.source_sync_runs (source_id, status, started_at)
      VALUES ($1, 'success', now())
      RETURNING id
    `,
      [sourceDef.rows[0].id]
    );

    const syncRunB = await client.query(
      `
      INSERT INTO private.source_sync_runs (source_id, status, started_at)
      VALUES ($1, 'success', now())
      RETURNING id
    `,
      [sourceDef.rows[0].id]
    );

    const versionA = await client.query(
      `
      INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, record_count)
      VALUES ($1, 'version-a', $2, 0)
      RETURNING id
    `,
      [sourceDef.rows[0].id, syncRunA.rows[0].id]
    );

    const versionB = await client.query(
      `
      INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, record_count)
      VALUES ($1, 'version-b', $2, 0)
      RETURNING id
    `,
      [sourceDef.rows[0].id, syncRunB.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [dataRelease.rows[0].id, sourceDef.rows[0].id, versionA.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [dataRelease.rows[0].id, sourceDef.rows[0].id, versionB.rows[0].id]
    );

    await expect(
      client.query(
        `
        INSERT INTO analysis.finding_evidence (finding_id, evidence_type, source_sync_run_id, source_dataset_version_id)
        VALUES ($1, 'source', $2, $3)
      `,
        [finding.rows[0].id, syncRunA.rows[0].id, versionB.rows[0].id]
      )
    ).rejects.toThrow("was not produced by sync run");
  });
});
