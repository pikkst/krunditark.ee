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

async function ensureRoles(client: Client) {
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role;
      END IF;
    END;
    $$;
  `);
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

describe("internal audit model database regression (KT-017)", () => {
  let client: Client;

  beforeAll(async () => {
    if (!DATABASE_URL) {
      console.log("Skipping database regression tests: DATABASE_URL not set");
      return;
    }
    client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    await ensureRoles(client);
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
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });
    const result = await client.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'private' AND table_name = 'audit_log'"
    );
    expect(Number(result.rows[0].count)).toBe(1);
  });

  runTest("actor_user_id is a bare UUID without live FK", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    const userId = crypto.randomUUID();

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb) AS id`,
      [
        userId,
        JSON.stringify({
          rule_version_id: crypto.randomUUID(),
          implementation_key: crypto.randomUUID(),
        }),
      ]
    );

    expect(auditId.rows[0].id).toBeDefined();

    const row = await client.query("SELECT actor_user_id FROM private.audit_log WHERE id = $1", [
      auditId.rows[0].id,
    ]);
    expect(row.rows[0].actor_user_id).toBe(userId);
  });

  runTest("deleting referenced auth user does not affect audit log", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    const userId = crypto.randomUUID();

    await client.query(
      `INSERT INTO auth.users (id, email, role, is_sso_user, is_anonymous) VALUES ($1, $2, 'authenticated', false, false)`,
      [userId, `test-${userId.slice(0, 8)}@example.com`]
    );

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb) AS id`,
      [
        userId,
        JSON.stringify({
          rule_version_id: crypto.randomUUID(),
          implementation_key: crypto.randomUUID(),
        }),
      ]
    );

    await client.query("DELETE FROM auth.users WHERE id = $1", [userId]);

    const row = await client.query("SELECT actor_user_id FROM private.audit_log WHERE id = $1", [
      auditId.rows[0].id,
    ]);
    expect(row.rows[0].actor_user_id).toBe(userId);
  });

  runTest("rejects unknown audit action codes", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'unknown.action', 'target', 'target-id')`,
        [crypto.randomUUID()]
      )
    ).rejects.toThrow("unknown audit action");
  });

  runTest("accepts all known action codes via log_audit_event", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

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
          metadata.rule_version_id = crypto.randomUUID();
          metadata.implementation_key = crypto.randomUUID();
          break;
        case "rule.retire":
          metadata.rule_version_id = crypto.randomUUID();
          break;
        case "source.promote":
          metadata.source_id = crypto.randomUUID();
          metadata.dataset_version_id = crypto.randomUUID();
          break;
        case "source.disable":
          metadata.source_id = crypto.randomUUID();
          break;
        case "source.manual_refresh":
          metadata.source_id = crypto.randomUUID();
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
          metadata.order_id = crypto.randomUUID();
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
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'analysis.invalidated', 'analysis', 'analysis-id', $2::jsonb)`,
        [crypto.randomUUID(), JSON.stringify({ analysis_id: crypto.randomUUID() })]
      )
    ).rejects.toThrow("analysis.invalidated requires annotation in metadata");
  });

  runTest("rejects metadata missing required fields for admin.role_changed", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'admin.role_changed', 'profile', 'profile-id', $2::jsonb)`,
        [crypto.randomUUID(), JSON.stringify({ target_user_id: crypto.randomUUID() })]
      )
    ).rejects.toThrow("admin.role_changed requires new_role in metadata");
  });

  runTest("rejects metadata with forbidden credential keys", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            authorization: "Bearer secret",
          }),
        ]
      )
    ).rejects.toThrow("audit metadata contains forbidden key");
  });

  runTest("rejects metadata with sensitive token patterns in values", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            notes: "use token=abc123 for debug",
          }),
        ]
      )
    ).rejects.toThrow("audit metadata value at key");
  });

  runTest("rejects metadata with sensitive tokens inside arrays", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            access_codes: ["bearer abc123", "token def456"],
          }),
        ]
      )
    ).rejects.toThrow("audit metadata array element contains sensitive pattern");
  });

  runTest("rejects bare bearer token values without key= or key: separator", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            notes: "Bearer abc123",
          }),
        ]
      )
    ).rejects.toThrow("audit metadata value at key");
  });

  runTest("rejects forbidden key with object value bypass", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            authorization: { value: "abc123" },
          }),
        ]
      )
    ).rejects.toThrow("audit metadata contains forbidden key");
  });

  runTest("rejects forbidden key with array value bypass", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            token: ["abc123"],
          }),
        ]
      )
    ).rejects.toThrow("audit metadata contains forbidden key");
  });

  runTest("rejects x-api-key separator variant", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            "x-api-key": "secret",
          }),
        ]
      )
    ).rejects.toThrow("audit metadata contains forbidden key");
  });

  runTest("rejects private-key separator variant", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            "private-key": "secret",
          }),
        ]
      )
    ).rejects.toThrow("audit metadata contains forbidden key");
  });

  runTest("rejects Authorization case variant", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: crypto.randomUUID(),
            implementation_key: crypto.randomUUID(),
            Authorization: "Bearer secret",
          }),
        ]
      )
    ).rejects.toThrow("audit metadata contains forbidden key");
  });

  runTest("rejects invalid UUID format for rule_version_id", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            rule_version_id: "not-a-uuid",
            implementation_key: crypto.randomUUID(),
          }),
        ]
      )
    ).rejects.toThrow("rule.verify has invalid type for field rule_version_id");
  });

  runTest("rejects invalid role value for admin.role_changed", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'admin.role_changed', 'profile', 'profile-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            target_user_id: crypto.randomUUID(),
            new_role: "superadmin",
            old_role: "user",
          }),
        ]
      )
    ).rejects.toThrow("admin.role_changed has invalid type for field new_role");
  });

  runTest("rejects negative amount for commerce.refund", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'commerce.refund', 'order', 'order-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            order_id: crypto.randomUUID(),
            amount: -10.0,
            reason: "customer request",
          }),
        ]
      )
    ).rejects.toThrow("commerce.refund has invalid type for field amount");
  });

  runTest("rejects non-numeric string amount for commerce.refund", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'commerce.refund', 'order', 'order-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({
            order_id: crypto.randomUUID(),
            amount: "not-a-number",
            reason: "customer request",
          }),
        ]
      )
    ).rejects.toThrow("commerce.refund has invalid type for field amount");
  });

  runTest("rejects boolean value for UUID field", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({ rule_version_id: true, implementation_key: crypto.randomUUID() }),
        ]
      )
    ).rejects.toThrow("rule.verify has invalid type for field rule_version_id");
  });

  runTest("rejects number value for text field", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'admin.role_changed', 'profile', 'profile-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({ target_user_id: crypto.randomUUID(), new_role: 123, old_role: "user" }),
        ]
      )
    ).rejects.toThrow("admin.role_changed has invalid type for field new_role");
  });

  runTest("rejects whitespace-only required values for analysis.invalidated", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'analysis.invalidated', 'analysis', 'analysis-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({ analysis_id: crypto.randomUUID(), annotation: "   " }),
        ]
      )
    ).rejects.toThrow("analysis.invalidated requires annotation in metadata");
  });

  runTest("rejects object value for required scalar field", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'analysis.invalidated', 'analysis', 'analysis-id', $2::jsonb)`,
        [crypto.randomUUID(), JSON.stringify({ analysis_id: {}, annotation: "test" })]
      )
    ).rejects.toThrow("analysis.invalidated requires analysis_id in metadata");
  });

  runTest("rejects array value for required scalar field", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'admin.role_changed', 'profile', 'profile-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({ target_user_id: crypto.randomUUID(), new_role: [], old_role: "user" }),
        ]
      )
    ).rejects.toThrow("admin.role_changed requires new_role in metadata");
  });

  runTest("rejects metadata with null required values for analysis.invalidated", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'analysis.invalidated', 'analysis', 'analysis-id', $2::jsonb)`,
        [crypto.randomUUID(), JSON.stringify({ analysis_id: null, annotation: "test" })]
      )
    ).rejects.toThrow("analysis.invalidated requires analysis_id in metadata");
  });

  runTest(
    "rejects metadata with empty string required values for analysis.invalidated",
    async () => {
      await withAdvisoryLock(client, async () => {
        await client.query("DROP SCHEMA IF EXISTS private CASCADE");
        await client.query("CREATE SCHEMA private");
        await client.query(sql);
      });

      await expect(
        client.query(
          `SELECT private.log_audit_event($1, 'system', 'analysis.invalidated', 'analysis', 'analysis-id', $2::jsonb)`,
          [
            crypto.randomUUID(),
            JSON.stringify({ analysis_id: crypto.randomUUID(), annotation: "" }),
          ]
        )
      ).rejects.toThrow("analysis.invalidated requires annotation in metadata");
    }
  );

  runTest("rejects metadata with null required values for admin.role_changed", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'admin.role_changed', 'profile', 'profile-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({ target_user_id: crypto.randomUUID(), new_role: null, old_role: "user" }),
        ]
      )
    ).rejects.toThrow("admin.role_changed requires new_role in metadata");
  });

  runTest("rejects metadata with empty string required values for commerce.refund", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `SELECT private.log_audit_event($1, 'system', 'commerce.refund', 'order', 'order-id', $2::jsonb)`,
        [
          crypto.randomUUID(),
          JSON.stringify({ order_id: crypto.randomUUID(), amount: "", reason: "customer request" }),
        ]
      )
    ).rejects.toThrow("commerce.refund requires amount in metadata");
  });

  runTest("rejects direct INSERT with unknown action code", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    await expect(
      client.query(
        `INSERT INTO private.audit_log (actor_type, action, target_type, target_id, safe_metadata) VALUES ('system', 'unknown.action', 'target', 'target-id', '{}'::jsonb)`
      )
    ).rejects.toThrow("unknown audit action");
  });

  runTest("audit_log rejects update after insert", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb) AS id`,
      [
        crypto.randomUUID(),
        JSON.stringify({
          rule_version_id: crypto.randomUUID(),
          implementation_key: crypto.randomUUID(),
        }),
      ]
    );

    await expect(
      client.query("UPDATE private.audit_log SET safe_metadata = '{}'::jsonb WHERE id = $1", [
        auditId.rows[0].id,
      ])
    ).rejects.toThrow("audit_log is immutable");
  });

  runTest("audit_log rejects delete after insert", async () => {
    await withAdvisoryLock(client, async () => {
      await client.query("DROP SCHEMA IF EXISTS private CASCADE");
      await client.query("CREATE SCHEMA private");
      await client.query(sql);
    });

    const auditId = await client.query(
      `SELECT private.log_audit_event($1, 'system', 'rule.verify', 'rule_version', 'test-rule', $2::jsonb) AS id`,
      [
        crypto.randomUUID(),
        JSON.stringify({
          rule_version_id: crypto.randomUUID(),
          implementation_key: crypto.randomUUID(),
        }),
      ]
    );

    await expect(
      client.query("DELETE FROM private.audit_log WHERE id = $1", [auditId.rows[0].id])
    ).rejects.toThrow("audit_log is immutable");
  });
});
