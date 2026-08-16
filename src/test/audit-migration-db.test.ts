import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const root = join(__dirname, "..", "..");
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260815000008_create_internal_audit_model.sql"
);

const sql = readFileSync(migrationPath, "utf-8");

describe("internal audit model database regression (KT-017)", () => {
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
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);
    const result = await client.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'private' AND table_name = 'audit_log'"
    );
    expect(Number(result.rows[0].count)).toBe(1);
  });

  runTest("actor_user_id is a bare UUID without live FK", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    const userId = crypto.randomUUID();

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', '{"rule_version_id": "rv-1", "implementation_key": "impl-1"}'::jsonb) AS id`,
      [userId]
    );

    expect(auditId.rows[0].id).toBeDefined();

    const row = await client.query("SELECT actor_user_id FROM private.audit_log WHERE id = $1", [
      auditId.rows[0].id,
    ]);
    expect(row.rows[0].actor_user_id).toBe(userId);
  });

  runTest("deleting referenced auth user does not affect audit log", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    const userId = crypto.randomUUID();

    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `test-${userId.slice(0, 8)}@example.com`]
    );

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', '{"rule_version_id": "rv-1", "implementation_key": "impl-1"}'::jsonb) AS id`,
      [userId]
    );

    await client.query("DELETE FROM auth.users WHERE id = $1", [userId]);

    const row = await client.query("SELECT actor_user_id FROM private.audit_log WHERE id = $1", [
      auditId.rows[0].id,
    ]);
    expect(row.rows[0].actor_user_id).toBe(userId);
  });

  runTest("rejects unknown audit action codes", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'unknown.action', 'target', 'target-id')`,
        [crypto.randomUUID()]
      )
    ).rejects.toThrow("unknown audit action");
  });

  runTest("accepts all known action codes via log_audit_event", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    const actions = [
      "rule.verify",
      "rule.retire",
      "source.promote",
      "source.disable",
      "source.manual_refresh",
      "admin.role_changed",
      "analysis.invalidated",
      "commerce.refund",
      "commerce.manual_entitlement",
    ];

    for (const action of actions) {
      const metadata: Record<string, string> = {};
      switch (action) {
        case "rule.verify":
          metadata.rule_version_id = "rv-1";
          metadata.implementation_key = "impl-1";
          break;
        case "rule.retire":
          metadata.rule_version_id = "rv-1";
          break;
        case "source.promote":
          metadata.source_id = "src-1";
          metadata.dataset_version_id = "dv-1";
          break;
        case "source.disable":
          metadata.source_id = "src-1";
          break;
        case "source.manual_refresh":
          metadata.source_id = "src-1";
          break;
        case "admin.role_changed":
          metadata.target_user_id = crypto.randomUUID();
          metadata.new_role = "admin";
          metadata.old_role = "user";
          break;
        case "analysis.invalidated":
          metadata.analysis_id = crypto.randomUUID();
          metadata.annotation = "manual review required";
          break;
        case "commerce.refund":
          metadata.order_id = "order-1";
          metadata.amount = "100.00";
          metadata.reason = "customer request";
          break;
        case "commerce.manual_entitlement":
          metadata.user_id = crypto.randomUUID();
          metadata.entitlement_type = "report";
          metadata.reason = "support grant";
          break;
      }

      const result = await client.query(
        `SELECT private.log_audit_event($1, 'system', $2, 'target', 'target-id', $3::jsonb) AS id`,
        [crypto.randomUUID(), action, JSON.stringify(metadata)]
      );
      expect(result.rows[0].id).toBeDefined();
    }
  });

  runTest("rejects metadata missing required fields for analysis.invalidated", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'analysis.invalidated', 'analysis', 'analysis-id', '{"analysis_id": "analysis-1"}'::jsonb)`,
        [crypto.randomUUID()]
      )
    ).rejects.toThrow("analysis.invalidated requires analysis_id and annotation in metadata");
  });

  runTest("rejects metadata missing required fields for admin.role_changed", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'admin.role_changed', 'profile', 'profile-id', '{"target_user_id": "user-1"}'::jsonb)`,
        [crypto.randomUUID()]
      )
    ).rejects.toThrow(
      "admin.role_changed requires target_user_id, new_role, and old_role in metadata"
    );
  });

  runTest("rejects metadata with forbidden credential keys", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', '{"rule_version_id": "rv-1", "implementation_key": "impl-1", "authorization": "Bearer secret"}'::jsonb)`,
        [crypto.randomUUID()]
      )
    ).rejects.toThrow("audit metadata contains forbidden key");
  });

  runTest("rejects metadata with sensitive token patterns in values", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', '{"rule_version_id": "rv-1", "implementation_key": "impl-1", "notes": "use token=abc123 for debug"}'::jsonb)`,
        [crypto.randomUUID()]
      )
    ).rejects.toThrow("audit metadata value at key");
  });

  runTest("rejects direct INSERT with unknown action code", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    await expect(
      client.query(
        `INSERT INTO private.audit_log (actor_type, action, target_type, target_id, safe_metadata) VALUES ('system', 'unknown.action', 'target', 'target-id', '{}'::jsonb)`
      )
    ).rejects.toThrow("unknown audit action");
  });

  runTest("rejects direct INSERT with valid action but missing required metadata", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    await expect(
      client.query(
        `INSERT INTO private.audit_log (actor_type, action, target_type, target_id, safe_metadata) VALUES ('system', 'analysis.invalidated', 'analysis', 'analysis-id', '{}'::jsonb)`
      )
    ).rejects.toThrow("analysis.invalidated requires analysis_id and annotation in metadata");
  });

  runTest("audit_log is immutable after insert", async () => {
    await client.query("DROP SCHEMA IF EXISTS private CASCADE");
    await client.query("CREATE SCHEMA private");
    await client.query(sql);

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', '{"rule_version_id": "rv-1", "implementation_key": "impl-1"}'::jsonb) AS id`,
      [crypto.randomUUID()]
    );

    await expect(
      client.query("UPDATE private.audit_log SET safe_metadata = '{}'::jsonb WHERE id = $1", [
        auditId.rows[0].id,
      ])
    ).rejects.toThrow("audit_log is immutable");

    await expect(
      client.query("DELETE FROM private.audit_log WHERE id = $1", [auditId.rows[0].id])
    ).rejects.toThrow("audit_log is immutable");
  });
});
