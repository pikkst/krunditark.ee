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
  "20260815000009_add_intent_code_to_projects.sql",
  "20260815000010_create_parcel_snapshots.sql",
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
  await client.query("DROP FUNCTION IF EXISTS geo.prevent_parcel_snapshot_mutation() CASCADE");
  await client.query("DROP FUNCTION IF EXISTS geo.calculate_parcel_area() CASCADE");
  await client.query("DROP FUNCTION IF EXISTS geo.validate_parcel_sync_run() CASCADE");
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

describe("parcel snapshot database regression (KT-027)", () => {
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

  runTest("applies all migrations to empty DB, geo.parcel_snapshots table exists", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const tables = await client.query(
      "SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'geo' AND table_name = 'parcel_snapshots'"
    );
    expect(tables.rows).toHaveLength(1);
    expect(tables.rows[0].table_schema).toBe("geo");
    expect(tables.rows[0].table_name).toBe("parcel_snapshots");
  });

  runTest("accepts valid Polygon in EPSG:3301, server-calculates area_m2_geometry", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`poly-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    const result = await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((350000 5500000, 350100 5500000, 350100 5500100, 350000 5500100, 350000 5500000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-1')
      RETURNING id, area_m2_geometry
      `,
      ["cad-1", sourceVersionId, sourceSyncRunId, "obj-1"]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].area_m2_geometry).toBeCloseTo(10000, 0);
  });

  runTest("accepts valid MultiPolygon in EPSG:3301", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`multipoly-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    const result = await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('MULTIPOLYGON(((650000 6600000, 650100 6600000, 650100 6600100, 650000 6600100, 650000 6600000)), ((650200 6602000, 650300 6602000, 650300 6603000, 650200 6603000, 650200 6602000)))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-multi')
      RETURNING id, area_m2_geometry
      `,
      ["cad-multi", sourceVersionId, sourceSyncRunId, "obj-multi"]
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].area_m2_geometry).toBeCloseTo(110000, 0);
  });

  runTest("rejects geometry with SRID 4326", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`srid-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    await expect(
      client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 4326), 10000, 'Test Address', 'v1', 'hash-srid')
        `,
        ["cad-srid", sourceVersionId, sourceSyncRunId, "obj-srid"]
      )
    ).rejects.toThrow();
  });

  runTest("rejects invalid polygon with (0,0) coordinates in EPSG:3301", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`invalid-geom-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    await expect(
      client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 650000 6601000, 651000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-invalid')
        `,
        ["cad-invalid", sourceVersionId, sourceSyncRunId, "obj-invalid"]
      )
    ).rejects.toThrow();
  });

  runTest("rejects GEOMETRYCOLLECTION EMPTY", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`empty-geom-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    await expect(
      client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('GEOMETRYCOLLECTION EMPTY'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-empty')
        `,
        ["cad-empty", sourceVersionId, sourceSyncRunId, "obj-empty"]
      )
    ).rejects.toThrow();
  });

  runTest("rejects LINESTRING geometry type", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`linestring-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    await expect(
      client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('LINESTRING(500000 6500000, 500100 6500100)'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-line')
        `,
        ["cad-line", sourceVersionId, sourceSyncRunId, "obj-line"]
      )
    ).rejects.toThrow();
  });

  runTest("rejects geometry with coords outside 350000-750000 X, 5500000-7000000 Y", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`coord-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    await expect(
      client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((300000 6500000, 300100 6500000, 300100 6500100, 300000 6500100, 300000 6500000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-coord')
        `,
        ["cad-coord", sourceVersionId, sourceSyncRunId, "obj-coord"]
      )
    ).rejects.toThrow();
  });

  runTest("rejects polygon with >100000 vertices", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`complex-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    const coords = [];
    const startX = 350000;
    const startY = 5500000;
    const endX = 400000;
    const midY = 5500001;
    const count = 50001;

    for (let i = 0; i < count; i++) {
      const x = startX + ((endX - startX) * i) / (count - 1);
      coords.push(`${x} ${startY}`);
    }
    coords.push(`${endX} ${midY}`);
    for (let i = count - 1; i >= 0; i--) {
      const x = startX + ((endX - startX) * i) / (count - 1);
      coords.push(`${x} ${midY}`);
    }
    coords.push(`${startX} ${startY}`);
    const wkt = `POLYGON((${coords.join(", ")}))`;

    await expect(
      client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID($5::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-complex')
        `,
        ["cad-complex", sourceVersionId, sourceSyncRunId, "obj-complex", wkt]
      )
    ).rejects.toThrow("parcel_snapshots_geometry_complexity");
  });

  runTest(
    "rejects snapshot where source_sync_run_id does not match dataset version sync_run_id",
    async () => {
      await withAdvisoryLock(client, async () => {
        await cleanStart(client);
      });

      const dataRelease = await client.query(
        `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
        [`provenance-test-${crypto.randomUUID().slice(0, 8)}`]
      );

      const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

      const otherSourceDef = await client.query(
        `INSERT INTO private.source_definitions (id, name, authority, source_type, base_url, refresh_policy, verification_policy, release_blocking, enabled, normalizer_version) VALUES ($1, 'Other', 'Test', 'WFS', 'https://example.com', 'monthly_snapshot', 'automatic_quality_gates', true, true, 'v1') RETURNING id`,
        [`test.source-other-${crypto.randomUUID().slice(0, 8)}`]
      );

      const otherSyncRun = await client.query(
        `INSERT INTO private.source_sync_runs (source_id, trigger_type, idempotency_key, status, started_at, normalizer_version, safe_metadata) VALUES ($1, 'manual', gen_random_uuid(), 'completed', now(), 'v1', '{}') RETURNING id`,
        [otherSourceDef.rows[0].id]
      );

      const wrongSyncRunId = otherSyncRun.rows[0].id;

      await expect(
        client.query(
          `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-provenance')
        `,
          ["cad-provenance", sourceVersionId, wrongSyncRunId, "obj-provenance"]
        )
      ).rejects.toThrow();
    }
  );

  runTest(
    "rejects duplicate insert for same source_dataset_version_id + source_object_id",
    async () => {
      await withAdvisoryLock(client, async () => {
        await cleanStart(client);
      });

      const dataRelease = await client.query(
        `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
        [`dedupe-test-${crypto.randomUUID().slice(0, 8)}`]
      );
      const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

      const sourceSyncRunId = (
        await client.query(
          `SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`,
          [sourceVersionId]
        )
      ).rows[0].sync_run_id;

      await client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-dedupe')
        `,
        ["cad-dedupe", sourceVersionId, sourceSyncRunId, "obj-dedupe"]
      );

      await expect(
        client.query(
          `
          INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
          VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-dedupe')
          `,
          ["cad-dedupe-2", sourceVersionId, sourceSyncRunId, "obj-dedupe"]
        )
      ).rejects.toThrow("duplicate key value violates unique constraint");
    }
  );

  runTest(
    "rejects duplicate insert for same cadastral_id + source_dataset_version_id when source_object_id is NULL",
    async () => {
      await withAdvisoryLock(client, async () => {
        await cleanStart(client);
      });

      const dataRelease = await client.query(
        `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
        [`fallback-dedupe-test-${crypto.randomUUID().slice(0, 8)}`]
      );
      const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

      const sourceSyncRunId = (
        await client.query(
          `SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`,
          [sourceVersionId]
        )
      ).rows[0].sync_run_id;

      await client.query(
        `
        INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
        VALUES ($1, $2, $3, NULL, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-fallback')
        `,
        ["cad-fallback", sourceVersionId, sourceSyncRunId]
      );

      await expect(
        client.query(
          `
          INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
          VALUES ($1, $2, $3, NULL, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-fallback-2')
          `,
          ["cad-fallback", sourceVersionId, sourceSyncRunId]
        )
      ).rejects.toThrow("duplicate key value violates unique constraint");
    }
  );

  runTest("allows same cadastral_id across different dataset versions", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`historical-test-${crypto.randomUUID().slice(0, 8)}`]
    );

    const { sourceVersionId: versionA } = await createSourceVersion(client, dataRelease.rows[0].id);
    const { sourceVersionId: versionB } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunIdA = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        versionA,
      ])
    ).rows[0].sync_run_id;

    const sourceSyncRunIdB = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        versionB,
      ])
    ).rows[0].sync_run_id;

    const resultA = await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-hist-a')
      RETURNING id
      `,
      ["cad-hist", versionA, sourceSyncRunIdA, "obj-hist-a"]
    );

    const resultB = await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((500200 6500200, 500300 6500200, 500300 6500300, 500200 6500300, 500200 6500200))'::extensions.geometry, 3301), 10000, 'Test Address v2', 'v1', 'hash-hist-b')
      RETURNING id
      `,
      ["cad-hist", versionB, sourceSyncRunIdB, "obj-hist-b"]
    );

    expect(resultA.rows).toHaveLength(1);
    expect(resultB.rows).toHaveLength(1);
    expect(resultA.rows[0].id).not.toBe(resultB.rows[0].id);
  });

  runTest("rejects UPDATE on persisted snapshot with 'parcel snapshot is immutable'", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`immutable-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    const snapshot = await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-immutable')
      RETURNING id
      `,
      ["cad-immutable", sourceVersionId, sourceSyncRunId, "obj-immutable"]
    );

    await client.query("SAVEPOINT immutability_update");
    await expect(
      client.query(
        `UPDATE geo.parcel_snapshots SET address_text = 'Changed Address' WHERE id = $1`,
        [snapshot.rows[0].id]
      )
    ).rejects.toThrow("parcel snapshot is immutable");
    await client.query("ROLLBACK TO SAVEPOINT immutability_update");
  });

  runTest("rejects DELETE on persisted snapshot with 'parcel snapshot is immutable'", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`delete-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    const snapshot = await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-delete')
      RETURNING id
      `,
      ["cad-delete", sourceVersionId, sourceSyncRunId, "obj-delete"]
    );

    await client.query("SAVEPOINT immutability_delete");
    await expect(
      client.query(`DELETE FROM geo.parcel_snapshots WHERE id = $1`, [snapshot.rows[0].id])
    ).rejects.toThrow("parcel snapshot is immutable");
    await client.query("ROLLBACK TO SAVEPOINT immutability_delete");
  });

  runTest("rejects setting current_parcel_snapshot_id to non-existent UUID", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `fk-test-${userId.slice(0, 8)}@example.com`]
    );

    const project = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'FK Test', '12345') RETURNING id`,
      [userId]
    );

    const nonExistentUuid = crypto.randomUUID();
    await client.query("SAVEPOINT project_fk_update");
    await expect(
      client.query(`UPDATE public.projects SET current_parcel_snapshot_id = $1 WHERE id = $2`, [
        nonExistentUuid,
        project.rows[0].id,
      ])
    ).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT project_fk_update");
  });

  runTest("rejects analysis with non-existent parcel_snapshot_id", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `analysis-fk-test-${userId.slice(0, 8)}@example.com`]
    );

    const project = await client.query(
      `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Analysis FK', '12345') RETURNING id`,
      [userId]
    );

    const proposal = await client.query(
      `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
      [project.rows[0].id]
    );

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`analysis-fk-${userId.slice(0, 8)}`]
    );

    await expect(
      client.query(
        `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')`,
        [project.rows[0].id, proposal.rows[0].id, crypto.randomUUID(), dataRelease.rows[0].id]
      )
    ).rejects.toThrow();
  });

  runTest(
    "rejects deleting parcel snapshot referenced by analysis (ON DELETE RESTRICT)",
    async () => {
      await withAdvisoryLock(client, async () => {
        await cleanStart(client);
      });

      const userId = crypto.randomUUID();
      await client.query(
        `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
        [userId, `restrict-test-${userId.slice(0, 8)}@example.com`]
      );

      const project = await client.query(
        `INSERT INTO public.projects (user_id, name, cadastral_id) VALUES ($1, 'Restrict Test', '12345') RETURNING id`,
        [userId]
      );

      const proposal = await client.query(
        `INSERT INTO public.project_proposals (project_id, structure_type, footprint, footprint_area_m2) VALUES ($1, 'detached_house', extensions.ST_SetSRID('POLYGON((0 0, 10 0, 10 10, 0 10, 0 0))'::extensions.geometry, 3301), 100) RETURNING id`,
        [project.rows[0].id]
      );

      const dataRelease = await client.query(
        `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
        [`restrict-${userId.slice(0, 8)}`]
      );

      const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

      const sourceSyncRunId = (
        await client.query(
          `SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`,
          [sourceVersionId]
        )
      ).rows[0].sync_run_id;

      const snapshot = await client.query(
        `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-restrict')
      RETURNING id
      `,
        ["cad-restrict", sourceVersionId, sourceSyncRunId, "obj-restrict"]
      );

      await client.query(
        `INSERT INTO analysis.analyses (project_id, proposal_id, parcel_snapshot_id, data_release_id, analysis_profile_version, engine_version, input_hash) VALUES ($1, $2, $3, $4, 'v1', 'v1', 'hash')`,
        [project.rows[0].id, proposal.rows[0].id, snapshot.rows[0].id, dataRelease.rows[0].id]
      );

      await client.query("SAVEPOINT restrict_delete");
      await expect(
        client.query(`DELETE FROM geo.parcel_snapshots WHERE id = $1`, [snapshot.rows[0].id])
      ).rejects.toThrow();
      await client.query("ROLLBACK TO SAVEPOINT restrict_delete");
    }
  );

  runTest("verifies area_m2_geometry matches ST_Area, not client input", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`area-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    const clientArea = 42;
    const result = await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 650100 6600000, 650100 6600100, 650000 6600100, 650000 6600000))'::extensions.geometry, 3301), $5, 'Test Address', 'v1', 'hash-area')
      RETURNING area_m2_geometry
      `,
      ["cad-area", sourceVersionId, sourceSyncRunId, "obj-area", clientArea]
    );

    expect(result.rows[0].area_m2_geometry).toBeCloseTo(10000, 0);
    expect(result.rows[0].area_m2_geometry).not.toBe(clientArea);
  });

  runTest("anon and authenticated roles cannot SELECT from geo.parcel_snapshots", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const userId = crypto.randomUUID();
    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `rls-geo-${userId.slice(0, 8)}@example.com`]
    );

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`rls-geo-${userId.slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    await client.query(
      `
      INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
      VALUES ('cad-rls', $1, $2, 'obj-rls', extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-rls')
      `,
      [sourceVersionId, sourceSyncRunId]
    );

    await client.query("SET ROLE anon");
    await client.query("SAVEPOINT anon_select");
    await expect(client.query("SELECT * FROM geo.parcel_snapshots")).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT anon_select");
    await client.query("RESET ROLE");

    await client.query("SET ROLE authenticated");
    await client.query(`SET request.jwt.claims = '${JSON.stringify({ sub: userId })}'`);
    await client.query("SAVEPOINT authenticated_select");
    await expect(client.query("SELECT * FROM geo.parcel_snapshots")).rejects.toThrow();
    await client.query("ROLLBACK TO SAVEPOINT authenticated_select");
    await client.query("RESET ROLE");
  });

  runTest("rejects insert with non-existent source_dataset_version_id", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`fk-version-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId: existingVersionId } = await createSourceVersion(
      client,
      dataRelease.rows[0].id
    );
    await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        existingVersionId,
      ])
    ).rows[0].sync_run_id;

    await expect(
      client.query(
        `
          INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
          VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-fk-version')
          `,
        ["cad-fk-version", crypto.randomUUID(), sourceSyncRunId, "obj-fk-version"]
      )
    ).rejects.toThrow("does not match dataset version");
  });

  runTest("rejects insert with non-existent source_sync_run_id", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`fk-run-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    await expect(
      client.query(
        `
          INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, normalizer_version, content_hash)
          VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', 'v1', 'hash-fk-run')
          `,
        ["cad-fk-run", sourceVersionId, crypto.randomUUID(), "obj-fk-run"]
      )
    ).rejects.toThrow("does not match dataset version");
  });

  runTest("rejects insert with oversized land_use_data", async () => {
    await withAdvisoryLock(client, async () => {
      await cleanStart(client);
    });

    const dataRelease = await client.query(
      `INSERT INTO private.data_releases (release_key, status) VALUES ($1, 'promoted') RETURNING id`,
      [`land-use-test-${crypto.randomUUID().slice(0, 8)}`]
    );
    const { sourceVersionId } = await createSourceVersion(client, dataRelease.rows[0].id);

    const sourceSyncRunId = (
      await client.query(`SELECT sync_run_id FROM private.source_dataset_versions WHERE id = $1`, [
        sourceVersionId,
      ])
    ).rows[0].sync_run_id;

    const oversized = JSON.stringify({ data: "x".repeat(70000) });

    await expect(
      client.query(
        `
          INSERT INTO geo.parcel_snapshots (cadastral_id, source_dataset_version_id, source_sync_run_id, source_object_id, geometry, area_m2_source, address_text, land_use_data, normalizer_version, content_hash)
          VALUES ($1, $2, $3, $4, extensions.ST_SetSRID('POLYGON((650000 6600000, 651000 6600000, 651000 6601000, 650000 6601000, 650000 6600000))'::extensions.geometry, 3301), 10000, 'Test Address', $5, 'v1', 'hash-land-use')
          `,
        ["cad-land-use", sourceVersionId, sourceSyncRunId, "obj-land-use", oversized]
      )
    ).rejects.toThrow("check constraint");
  });

  runTest(
    "constraint/index presence: GiST index, B-tree indexes, unique indexes exist",
    async () => {
      await withAdvisoryLock(client, async () => {
        await cleanStart(client);
      });

      const indexes = await client.query(
        `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'geo' AND tablename = 'parcel_snapshots'
      ORDER BY indexname
      `
      );

      const indexNames = indexes.rows.map((r) => r.indexname);

      expect(indexNames).toContain("idx_parcel_snapshots_geometry");
      expect(indexNames.some((n) => n.includes("idx_parcel_snapshots_cadastral_version"))).toBe(
        true
      );
      expect(indexNames.some((n) => n.includes("idx_parcel_snapshots_cadastral_retrieved"))).toBe(
        true
      );
      expect(indexNames).toContain("idx_parcel_snapshots_unique_object");
      expect(indexNames).toContain("idx_parcel_snapshots_unique_content");

      const gistIndex = indexes.rows.find((r) => r.indexname === "idx_parcel_snapshots_geometry");
      expect(gistIndex).toBeDefined();
      expect(gistIndex.indexdef).toMatch(/USING\s+GIST/i);
    }
  );
});

async function createSourceVersion(client: Client, dataReleaseId: string) {
  const sourceId = `test.source-${crypto.randomUUID().slice(0, 8)}`;
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
