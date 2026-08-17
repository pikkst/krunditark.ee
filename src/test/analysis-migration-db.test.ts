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
const concurrencyFixPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000006_fix_terminal_child_concurrency.sql"
);
const projectBindingFixPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000007_fix_analysis_project_proposal_binding.sql"
);
const parcelSnapshotPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000010_create_parcel_snapshots.sql"
);

const migrationSql = readFileSync(migrationPath, "utf-8");
const concurrencyFixSql = readFileSync(concurrencyFixPath, "utf-8");
const projectBindingFixSql = readFileSync(projectBindingFixPath, "utf-8");
const parcelSnapshotSql = readFileSync(parcelSnapshotPath, "utf-8");

async function applyMigrations(client: Client) {
  await client.query(migrationSql);
  await client.query(concurrencyFixSql);
  await client.query(projectBindingFixSql);
  await client.query(parcelSnapshotSql);
}

const DB_TEST_ADVISORY_LOCK = 0xdeadbeef;

async function withAdvisoryLock<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query("SELECT pg_advisory_lock($1)", [DB_TEST_ADVISORY_LOCK]);
  try {
    return await fn();
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [DB_TEST_ADVISORY_LOCK]);
  }
}

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
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });
    const result = await client.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'analysis'"
    );
    expect(Number(result.rows[0].count)).toBe(5);
  });

  runTest("prevents child mutation after parent analysis reaches terminal state", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceId, sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);
    void (await createSourceVersion(client, dataRelease.rows[0].id));

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [analysis.rows[0].id, sourceId, sourceVersionId]
    );

    await client.query(
      `
      UPDATE analysis.analyses SET status = 'completed' WHERE id = $1
    `,
      [analysis.rows[0].id]
    );

    const completed = await client.query(`SELECT status FROM analysis.analyses WHERE id = $1`, [
      analysis.rows[0].id,
    ]);
    expect(completed.rows[0].status).toBe("completed");
  });

  runTest("prevents child insert after parent analysis reaches terminal state", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceId, sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [analysis.rows[0].id, sourceId, sourceVersionId]
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
        VALUES ($1, $2, $3)
      `,
        [analysis.rows[0].id, sourceId, sourceVersionId]
      )
    ).rejects.toThrow("cannot insert child rows for terminal analysis");
  });

  runTest("prevents child update after parent analysis reaches terminal state", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceId, sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );

    const { sourceId: otherSourceId, sourceVersionId: otherSourceVersionId } =
      await createSourceVersion(client, dataRelease.rows[0].id);

    await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [analysis.rows[0].id, sourceId, sourceVersionId]
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
        UPDATE analysis.analysis_source_versions SET source_id = $1, source_dataset_version_id = $2 WHERE analysis_id = $3 AND source_id = $4
      `,
        [otherSourceId, otherSourceVersionId, analysis.rows[0].id, sourceId]
      )
    ).rejects.toThrow("cannot modify child rows of terminal analysis");
  });

  runTest("prevents child delete after parent analysis reaches terminal state", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );

    const { sourceId, sourceVersionId: sourceVersionId2 } = await createSourceVersion(
      client,
      dataRelease.rows[0].id
    );

    await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [analysis.rows[0].id, sourceId, sourceVersionId2]
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
        DELETE FROM analysis.analysis_source_versions WHERE analysis_id = $1 AND source_id = $2
      `,
        [analysis.rows[0].id, sourceId]
      )
    ).rejects.toThrow("cannot delete child rows of terminal analysis");
  });

  runTest("prevents moving child rows away from terminal analysis", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease1 = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('release-1-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const dataRelease2 = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('release-2-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceVersionId: earlyVersionId1 } = await createSourceVersion(
      client,
      dataRelease1.rows[0].id
    );
    const { parcelSnapshotId: parcelSnapshotId1 } = await createParcelSnapshot(
      client,
      earlyVersionId1
    );
    const { sourceVersionId: earlyVersionId2 } = await createSourceVersion(
      client,
      dataRelease2.rows[0].id
    );
    const { parcelSnapshotId: parcelSnapshotId2 } = await createParcelSnapshot(
      client,
      earlyVersionId2
    );

    const analysis1 = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId1, dataRelease1.rows[0].id]
    );

    const analysis2 = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId2, dataRelease2.rows[0].id]
    );

    const { sourceId: sourceId1, sourceVersionId: sourceVersionId1 } = await createSourceVersion(
      client,
      dataRelease1.rows[0].id
    );
    void (await createSourceVersion(client, dataRelease2.rows[0].id));

    await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [analysis1.rows[0].id, sourceId1, sourceVersionId1]
    );

    await client.query(
      `
      UPDATE analysis.analyses SET status = 'completed' WHERE id = $1
    `,
      [analysis1.rows[0].id]
    );

    await expect(
      client.query(
        `
        UPDATE analysis.analysis_source_versions SET analysis_id = $1 WHERE analysis_id = $2 AND source_id = $3
      `,
        [analysis2.rows[0].id, analysis1.rows[0].id, sourceId1]
      )
    ).rejects.toThrow("cannot modify child rows of terminal analysis");
  });

  runTest("allows normal child insert/update/delete on non-terminal analysis", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceId, sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );

    const { sourceId: otherSourceId, sourceVersionId: otherSourceVersionId } =
      await createSourceVersion(client, dataRelease.rows[0].id);

    await client.query(
      `
      INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [analysis.rows[0].id, sourceId, sourceVersionId]
    );

    await client.query(
      `UPDATE analysis.analysis_source_versions SET source_id = $1, source_dataset_version_id = $2 WHERE analysis_id = $3 AND source_id = $4`,
      [otherSourceId, otherSourceVersionId, analysis.rows[0].id, sourceId]
    );

    await client.query(
      `DELETE FROM analysis.analysis_source_versions WHERE analysis_id = $1 AND source_id = $2`,
      [analysis.rows[0].id, otherSourceId]
    );
  });

  runTest("rejects mismatched evidence source sync run and dataset version", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    const analysis = await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      RETURNING id
    `,
      [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );

    const finding = await client.query(
      `
      INSERT INTO analysis.findings (analysis_id, code, category, state, title_key)
      VALUES ($1, 'TEST', 'test', 'clear', 'test.key')
      RETURNING id
    `,
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
      `
      INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata)
      VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}')
      RETURNING id
    `,
      [sourceDefA.rows[0].id]
    );

    const syncRunB = await client.query(
      `
      INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata)
      VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}')
      RETURNING id
    `,
      [sourceDefB.rows[0].id]
    );

    const versionA = await client.query(
      `
      INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, status, retrieved_at, normalizer_version, record_count, validation_summary)
      VALUES ($1, 'version-a', $2, 'verified', now(), 'v1', 0, '{}')
      RETURNING id
    `,
      [sourceDefA.rows[0].id, syncRunA.rows[0].id]
    );

    const versionB = await client.query(
      `
      INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, status, retrieved_at, normalizer_version, record_count, validation_summary)
      VALUES ($1, 'version-b', $2, 'verified', now(), 'v1', 0, '{}')
      RETURNING id
    `,
      [sourceDefB.rows[0].id, syncRunB.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [dataRelease.rows[0].id, sourceDefA.rows[0].id, versionA.rows[0].id]
    );

    await client.query(
      `
      INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id)
      VALUES ($1, $2, $3)
    `,
      [dataRelease.rows[0].id, sourceDefB.rows[0].id, versionB.rows[0].id]
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

  runTest("rejects mismatched project and proposal", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
    );

    const projectA = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Project A', '12345')
      RETURNING id
    `,
      [userId]
    );

    const projectB = await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Project B', '67890')
      RETURNING id
    `,
      [userId]
    );

    const proposalInB = await client.query(
      `
      INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [projectB.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    await expect(
      client.query(
        `
        INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
        VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      `,
        [projectA.rows[0].id, proposalInB.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
      )
    ).rejects.toThrow();
  });

  runTest("rejects nonexistent proposal for guest analysis", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
    );

    await client.query(
      `
      INSERT INTO public.projects (user_id, name, cadastral_id)
      VALUES ($1, 'Test', '12345')
      RETURNING id
    `,
      [userId]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    await expect(
      client.query(
        `
        INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
        VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
      `,
        [null, crypto.randomUUID(), parcelSnapshotId, dataRelease.rows[0].id]
      )
    ).rejects.toThrow();
  });

  runTest("accepts valid proposal for guest analysis", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
    `,
      [null, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );
  });

  runTest("accepts valid proposal for guest analysis", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS analysis CASCADE");
      await client.query("CREATE SCHEMA analysis");
      await applyMigrations(client);
    });

    const userId = crypto.randomUUID();
    const userEmail = `test-${userId.slice(0, 8)}@example.com`;

    await client.query(
      `
      INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
    `,
      [userId, userEmail]
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
      VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
      RETURNING id
    `,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `
      INSERT INTO private.data_releases (release_key, status)
      VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
      RETURNING id
    `,
      [userId]
    );

    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { parcelSnapshotId } = await createParcelSnapshot(client, sourceVersionId);

    await client.query(
      `
      INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
      VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
    `,
      [null, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
    );
  });

  runTest(
    "prevents re-parenting proposal after analysis references it (two-connection)",
    async () => {
      const clientA = new Client({ connectionString: DATABASE_URL });
      const clientB = new Client({ connectionString: DATABASE_URL });
      await clientA.connect();
      await clientB.connect();

      try {
        await withAdvisoryLock(clientA, async () => {
          await clientA.query("DROP SCHEMA IF EXISTS analysis CASCADE");
          await clientA.query("CREATE SCHEMA analysis");
          await applyMigrations(clientA);
        });

        const userId = crypto.randomUUID();
        const userEmail = `test-${userId.slice(0, 8)}@example.com`;

        await clientA.query(
          `
          INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
        `,
          [userId, userEmail]
        );

        const projectA = await clientA.query(
          `
          INSERT INTO public.projects (user_id, name, cadastral_id)
          VALUES ($1, 'Project A', '12345')
          RETURNING id
        `,
          [userId]
        );

        const projectB = await clientA.query(
          `
          INSERT INTO public.projects (user_id, name, cadastral_id)
          VALUES ($1, 'Project B', '67890')
          RETURNING id
        `,
          [userId]
        );

        const proposal = await clientA.query(
          `
          INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
          VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
          RETURNING id
        `,
          [projectA.rows[0].id]
        );

        const dataRelease = await clientA.query(
          `
          INSERT INTO private.data_releases (release_key, status)
          VALUES ($1, 'promoted')
          RETURNING id
        `,
          [userId]
        );

        const { sourceVersionId } = await createSourceVersion(clientA, dataRelease.rows[0].id);
        const { parcelSnapshotId } = await createParcelSnapshot(clientA, sourceVersionId);

        await clientA.query(
          `
          INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
          VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
        `,
          [projectA.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
        );

        await expect(
          clientB.query(
            `
            UPDATE public.project_proposals SET project_id = $1 WHERE id = $2
          `,
            [projectB.rows[0].id, proposal.rows[0].id]
          )
        ).rejects.toThrow();

        await clientA.query("ROLLBACK");
        await clientB.query("ROLLBACK");
      } finally {
        await clientA.end();
        await clientB.end();
      }
    }
  );

  runTest(
    "prevents child mutation after concurrent terminal transition",
    async () => {
      const clientA = new Client({ connectionString: DATABASE_URL });
      const clientB = new Client({ connectionString: DATABASE_URL });
      await clientA.connect();
      await clientB.connect();

      try {
        await withAdvisoryLock(clientA, async () => {
          await clientA.query("DROP SCHEMA IF EXISTS analysis CASCADE");
          await clientA.query("CREATE SCHEMA analysis");
          await applyMigrations(clientA);
        });

        const userId = crypto.randomUUID();
        const userEmail = `test-${userId.slice(0, 8)}@example.com`;

        await clientA.query("BEGIN");
        await clientA.query(
          `
          INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)
        `,
          [userId, userEmail]
        );

        const project = await clientA.query(
          `
          INSERT INTO public.projects (user_id, name, cadastral_id)
          VALUES ($1, 'Test', '12345')
          RETURNING id
        `,
          [userId]
        );

        const proposal = await clientA.query(
          `
          INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2)
          VALUES ($1, 'detached_house', ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100)
          RETURNING id
        `,
          [project.rows[0].id]
        );

        const dataRelease = await clientA.query(
          `
          INSERT INTO private.data_releases (release_key, status)
          VALUES ('test-release-' || substr($1, 1, 8), 'promoted')
          RETURNING id
        `,
          [userId]
        );

        const { sourceVersionId } = await createSourceVersion(clientA, dataRelease.rows[0].id);
        const { parcelSnapshotId } = await createParcelSnapshot(clientA, sourceVersionId);

        const analysis = await clientA.query(
          `
          INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash)
          VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')
          RETURNING id
        `,
          [project.rows[0].id, proposal.rows[0].id, parcelSnapshotId, dataRelease.rows[0].id]
        );

        const sourceDef = await clientA.query(
          `
          INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version)
          VALUES ($1, 'Test', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1')
          RETURNING id
        `,
          [`test.source-concurrent-${userId.slice(0, 8)}`]
        );

        const syncRun = await clientA.query(
          `
          INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata)
          VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}')
          RETURNING id
        `,
          [sourceDef.rows[0].id]
        );

        const sourceVersion = await clientA.query(
          `
          INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, status, retrieved_at, normalizer_version, record_count, validation_summary)
          VALUES ($1, 'version-1', $2, 'verified', now(), 'v1', 0, '{}')
          RETURNING id
        `,
          [sourceDef.rows[0].id, syncRun.rows[0].id]
        );

        await clientA.query(
          `
          INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id)
          VALUES ($1, $2, $3)
        `,
          [dataRelease.rows[0].id, sourceDef.rows[0].id, sourceVersion.rows[0].id]
        );

        await clientA.query(
          `
          INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id)
          VALUES ($1, $2, $3)
        `,
          [analysis.rows[0].id, sourceDef.rows[0].id, sourceVersion.rows[0].id]
        );

        await clientA.query("COMMIT");

        await clientA.query("BEGIN");
        await clientB.query("BEGIN");

        await clientA.query(`UPDATE analysis.analyses SET status = 'completed' WHERE id = $1`, [
          analysis.rows[0].id,
        ]);

        const childInsertPromise = clientB.query(
          `INSERT INTO analysis.analysis_source_versions (analysis_id, source_id, source_dataset_version_id) VALUES ($1, $2, $3)`,
          [analysis.rows[0].id, sourceDef.rows[0].id, sourceVersion.rows[0].id]
        );

        await clientA.query("COMMIT");

        await expect(childInsertPromise).rejects.toThrow(
          "cannot insert child rows for terminal analysis"
        );

        await clientB.query("ROLLBACK");
      } finally {
        await clientA.end();
        await clientB.end();
      }
    },
    10000
  );
});

async function createSourceVersion(client: Client, dataReleaseId: string) {
  sourceCounter += 1;
  const sourceId = `test.source-${sourceCounter}-${crypto.randomUUID().slice(0, 8)}`;
  const sourceDef = await client.query(
    `
    INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version)
    VALUES ($1, 'Test', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1')
    RETURNING id
  `,
    [sourceId]
  );

  const syncRun = await client.query(
    `
    INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata)
    VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}')
    RETURNING id
  `,
    [sourceDef.rows[0].id]
  );

  const sourceVersion = await client.query(
    `
    INSERT INTO private.source_dataset_versions (source_id, version_key, sync_run_id, status, retrieved_at, normalizer_version, record_count, validation_summary)
    VALUES ($1, 'version-1', $2, 'verified', now(), 'v1', 0, '{}')
    RETURNING id
  `,
    [sourceDef.rows[0].id, syncRun.rows[0].id]
  );

  await client.query(
    `
    INSERT INTO private.data_release_sources (data_release_id, source_id, source_dataset_version_id)
    VALUES ($1, $2, $3)
  `,
    [dataReleaseId, sourceDef.rows[0].id, sourceVersion.rows[0].id]
  );

  return { sourceId: sourceDef.rows[0].id, sourceVersionId: sourceVersion.rows[0].id };
}

let parcelCounter = 0;

async function createParcelSnapshot(client: Client, sourceVersionId: string) {
  parcelCounter += 1;
  const cadastralId = `parcel-${parcelCounter}`;
  const snapshot = await client.query(
    `
    INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
    SELECT $1, $2, dv.sync_run_id, $3, extensions.ST_SetSRID('POLYGON((350000 5500000, 350100 5500000, 350100 5500100, 350000 5500100, 350000 5500000))'::extensions.geometry, 3301), 10000, 'Test Address ' || $1, 'v1', 'hash-' || $1
    FROM private.source_dataset_versions dv
    WHERE dv.id = $2
    RETURNING id
  `,
    [cadastralId, sourceVersionId, `obj-${parcelCounter}`]
  );
  return { parcelSnapshotId: snapshot.rows[0].id, cadastralId };
}

let sourceCounter = 0;
