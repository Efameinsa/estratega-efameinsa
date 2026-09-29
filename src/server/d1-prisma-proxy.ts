/**
 * Generic D1-to-Prisma proxy.
 *
 * Translates the subset of Prisma API used in this app into raw D1 SQL.
 * This is needed because PrismaClient cannot run on Cloudflare Workers
 * (fs.readdir is not implemented in the Workers runtime).
 *
 * Supported: findMany, findFirst, findUnique, findUniqueOrThrow,
 *            create, update, delete, count, upsert,
 *            createMany, aggregate, $transaction
 *
 * Limitations:
 * - No nested includes (joins) — returns flat rows
 * - No complex where clauses (nested OR/AND/NOT)
 * - include/select are partially supported via JOINs for known relations
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cuid-like ID (matches Prisma's @default(cuid()))
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 12);
  return `c${timestamp}${random}`;
}

/**
 * Resolve Prisma relation writes ({ connect: { id }, create: {...} })
 * into flat foreign key fields.
 * e.g. { organization: { connect: { id: "x" } } } → { organizationId: "x" }
 */
function flattenRelationWrites(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      if (val.connect && val.connect.id) {
        // { relation: { connect: { id: "x" } } } → { relationId: "x" }
        result[`${key}Id`] = val.connect.id;
        continue;
      }
      if (val.disconnect === true) {
        result[`${key}Id`] = null;
        continue;
      }
    }
    result[key] = val;
  }
  return result;
}

/**
 * Convert a JS value to a D1-safe primitive.
 * D1 only accepts: string, number, null, boolean, ArrayBuffer.
 */
function toD1Value(val: any): string | number | null | boolean {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "boolean") return val ? 1 : 0;
  if (typeof val === "string" || typeof val === "number") return val;
  // Arrays and objects → JSON string
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/**
 * Flatten Prisma composite unique keys.
 * e.g. { issueId_labelId: { issueId: "a", labelId: "b" } }
 * → { issueId: "a", labelId: "b" }
 */
function flattenWhere(where: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(where)) {
    if (
      val !== null &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      !(val instanceof Date) &&
      key.includes("_") &&
      // Check if it looks like a composite key (all values are primitives)
      Object.values(val).every((v) => v === null || typeof v !== "object" || v instanceof Date)
    ) {
      // Composite key — flatten its fields into the where
      Object.assign(result, val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Known relation-to-FK mappings for nested where resolution.
 * Maps: parentTable.relationField → { table, fk, parentFk }
 * e.g. Portfolio.cycle → { table: "StrategicCycle", fk: "id", parentFk: "cycleId" }
 */
const RELATION_FK_MAP: Record<string, Record<string, { table: string; fk: string; parentFk: string }>> = {
  Portfolio: {
    cycle: { table: "StrategicCycle", fk: "id", parentFk: "cycleId" },
    axis: { table: "StrategicAxis", fk: "id", parentFk: "axisId" },
  },
  Program: {
    portfolio: { table: "Portfolio", fk: "id", parentFk: "portfolioId" },
  },
  Project: {
    portfolio: { table: "Portfolio", fk: "id", parentFk: "portfolioId" },
    program: { table: "Program", fk: "id", parentFk: "programId" },
  },
  Issue: {
    project: { table: "Project", fk: "id", parentFk: "projectId" },
    status: { table: "WorkflowStatus", fk: "id", parentFk: "statusId" },
  },
};

/**
 * Flatten nested relation where into subquery conditions.
 * e.g. { cycle: { organizationId: "x" } } on table "Portfolio"
 * → { cycleId IN (SELECT id FROM StrategicCycle WHERE organizationId = ?) }
 */
function resolveRelationWhere(
  tableName: string,
  where: Record<string, any>,
  params: any[]
): { flatWhere: Record<string, any>; extraClauses: string[] } {
  const flatWhere: Record<string, any> = {};
  const extraClauses: string[] = [];
  const tableRelations = RELATION_FK_MAP[tableName] ?? {};

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;

    const rel = tableRelations[key];
    if (rel && val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date) && !isOperatorObject(val)) {
      // This is a relation filter — resolve recursively
      const innerWhere = val as Record<string, any>;
      // Check for nested relations (e.g. portfolio.cycle.organizationId)
      const { flatWhere: innerFlat, extraClauses: innerExtra } = resolveRelationWhere(rel.table, innerWhere, params);

      // Build subquery
      const innerParams: any[] = [];
      const innerWhereSql = buildWhereFromFlat(innerFlat, innerParams);
      params.push(...innerParams);

      let subquery = `"${rel.parentFk}" IN (SELECT "${rel.fk}" FROM "${rel.table}"${innerWhereSql}`;
      if (innerExtra.length > 0) {
        subquery += (innerWhereSql ? " AND " : " WHERE ") + innerExtra.join(" AND ");
      }
      subquery += ")";
      extraClauses.push(subquery);
    } else {
      flatWhere[key] = val;
    }
  }

  return { flatWhere, extraClauses };
}

/** Build WHERE clause from flat (non-relation) fields only */
function buildWhereFromFlat(flat: Record<string, any>, params: any[]): string {
  if (Object.keys(flat).length === 0) return "";
  const clauses: string[] = [];
  for (const [key, val] of Object.entries(flat)) {
    if (val === undefined) continue;
    if (val === null) {
      clauses.push(`"${key}" IS NULL`);
    } else if (isOperatorObject(val)) {
      addOperatorClause(clauses, params, key, val);
    } else {
      params.push(toD1Value(val));
      clauses.push(`"${key}" = ?`);
    }
  }
  return clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
}

function addOperatorClause(clauses: string[], params: any[], key: string, val: any) {
  for (const [op, opVal] of Object.entries(val)) {
    if (op === "contains") { params.push(`%${opVal}%`); clauses.push(`"${key}" LIKE ?`); }
    else if (op === "startsWith") { params.push(`${opVal}%`); clauses.push(`"${key}" LIKE ?`); }
    else if (op === "endsWith") { params.push(`%${opVal}`); clauses.push(`"${key}" LIKE ?`); }
    else if (op === "in") {
      const arr = opVal as any[];
      if (arr.length === 0) { clauses.push("0 = 1"); }
      else { params.push(...arr.map(toD1Value)); clauses.push(`"${key}" IN (${arr.map(() => "?").join(", ")})`); }
    }
    else if (op === "notIn") {
      const arr = opVal as any[];
      if (arr.length > 0) { params.push(...arr.map(toD1Value)); clauses.push(`"${key}" NOT IN (${arr.map(() => "?").join(", ")})`); }
    }
    else if (op === "not") {
      if (opVal === null) clauses.push(`"${key}" IS NOT NULL`);
      else { params.push(toD1Value(opVal)); clauses.push(`"${key}" != ?`); }
    }
    else if (op === "equals") { params.push(toD1Value(opVal)); clauses.push(`"${key}" = ?`); }
    else if (op === "gte") { params.push(toD1Value(opVal)); clauses.push(`"${key}" >= ?`); }
    else if (op === "lte") { params.push(toD1Value(opVal)); clauses.push(`"${key}" <= ?`); }
    else if (op === "gt") { params.push(toD1Value(opVal)); clauses.push(`"${key}" > ?`); }
    else if (op === "lt") { params.push(toD1Value(opVal)); clauses.push(`"${key}" < ?`); }
  }
}

function isOperatorObject(val: any): boolean {
  if (val === null || typeof val !== "object" || Array.isArray(val) || val instanceof Date) return false;
  const keys = Object.keys(val);
  const operators = ["contains", "in", "not", "gte", "lte", "gt", "lt", "startsWith", "endsWith", "equals", "notIn"];
  return keys.some((k) => operators.includes(k));
}

function buildWhere(
  where: Record<string, any> | undefined,
  params: any[],
  tableName?: string
): string {
  if (!where || Object.keys(where).length === 0) return "";

  const flat = flattenWhere(where);

  // Resolve nested relation filters into subqueries
  if (tableName) {
    const { flatWhere, extraClauses } = resolveRelationWhere(tableName, flat, params);
    const baseSql = buildWhereFromFlat(flatWhere, params);
    if (extraClauses.length === 0) return baseSql;
    if (baseSql) return baseSql + " AND " + extraClauses.join(" AND ");
    return " WHERE " + extraClauses.join(" AND ");
  }

  return buildWhereFromFlat(flat, params);
}

function buildOrderBy(orderBy: any): string {
  if (!orderBy) return "";
  if (Array.isArray(orderBy)) {
    return (
      " ORDER BY " +
      orderBy
        .map((o: any) => {
          const [k, v] = Object.entries(o)[0];
          return `"${k}" ${(v as string).toUpperCase()}`;
        })
        .join(", ")
    );
  }
  const [k, v] = Object.entries(orderBy)[0];
  return ` ORDER BY "${k}" ${(v as string).toUpperCase()}`;
}

function buildSelect(select: Record<string, boolean> | undefined): string {
  if (!select) return "*";
  return Object.entries(select)
    .filter(([, v]) => v)
    .map(([k]) => `"${k}"`)
    .join(", ");
}

// Prisma returns Date objects for datetime fields. D1 returns strings.
function parseRow(row: Record<string, any>): Record<string, any> {
  return row;
}

// ---------------------------------------------------------------------------
// Model Proxy
// ---------------------------------------------------------------------------

function createModelProxy(d1: D1Database, tableName: string) {
  return {
    async findMany(args?: any) {
      const params: any[] = [];
      const sel = buildSelect(args?.select);
      const where = buildWhere(args?.where, params, tableName);
      const order = buildOrderBy(args?.orderBy);
      const limit = args?.take ? ` LIMIT ${args.take}` : "";
      const skip = args?.skip ? ` OFFSET ${args.skip}` : "";

      const sql = `SELECT ${sel} FROM "${tableName}"${where}${order}${limit}${skip}`;
      const result = await d1.prepare(sql).bind(...params).all();
      const rows = (result.results ?? []).map(parseRow);

      // Handle include (simple one-level relations)
      if (args?.include) {
        return Promise.all(rows.map((row) => resolveIncludes(d1, tableName, row, args.include)));
      }
      return rows;
    },

    async findFirst(args?: any) {
      const results = await this.findMany({ ...args, take: 1 });
      return results[0] ?? null;
    },

    async findUnique(args: any) {
      const params: any[] = [];
      const where = buildWhere(args.where, params, tableName);
      const sql = `SELECT * FROM "${tableName}"${where} LIMIT 1`;
      const row = await d1.prepare(sql).bind(...params).first();
      if (!row) return null;
      if (args?.include) return resolveIncludes(d1, tableName, row as any, args.include);
      return parseRow(row as any);
    },

    async findUniqueOrThrow(args: any) {
      const result = await this.findUnique(args);
      if (!result) throw new Error(`Record not found in ${tableName}`);
      return result;
    },

    async create(args: any) {
      const data = flattenRelationWrites(args.data);
      // Auto-generate defaults that Prisma normally handles
      if (!data.id) data.id = generateId();
      if (!data.createdAt) data.createdAt = new Date();
      if (!data.updatedAt) data.updatedAt = new Date();
      const keys = Object.keys(data).filter((k) => data[k] !== undefined);
      const values = keys.map((k) => toD1Value(data[k]));
      const placeholders = keys.map(() => "?").join(", ");
      const cols = keys.map((k) => `"${k}"`).join(", ");

      const sql = `INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders}) RETURNING *`;
      const row = await d1.prepare(sql).bind(...values).first();
      if (!row) {
        // D1 might not support RETURNING, fallback
        await d1
          .prepare(`INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`)
          .bind(...values)
          .run();
        // Try to fetch the inserted row
        if (data.id) {
          return this.findUnique({ where: { id: data.id }, include: args?.include });
        }
        return data;
      }
      if (args?.include) return resolveIncludes(d1, tableName, row as any, args.include);
      return parseRow(row as any);
    },

    async createMany(args: any) {
      const dataArr: any[] = args.data;
      let count = 0;
      for (const data of dataArr) {
        if (!data.id) data.id = generateId();
        if (!data.createdAt) data.createdAt = new Date();
        if (!data.updatedAt) data.updatedAt = new Date();
        const keys = Object.keys(data).filter((k) => data[k] !== undefined);
        const values = keys.map((k) => toD1Value(data[k]));
        const placeholders = keys.map(() => "?").join(", ");
        const cols = keys.map((k) => `"${k}"`).join(", ");
        await d1
          .prepare(`INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders})`)
          .bind(...values)
          .run();
        count++;
      }
      return { count };
    },

    async update(args: any) {
      const data = flattenRelationWrites(args.data);
      data.updatedAt = new Date();
      const where = args.where;
      const params: any[] = [];
      const sets = Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => {
          params.push(toD1Value(v));
          return `"${k}" = ?`;
        })
        .join(", ");

      const whereClause = buildWhere(where, params);
      const sql = `UPDATE "${tableName}" SET ${sets}${whereClause}`;
      await d1.prepare(sql).bind(...params).run();

      return this.findUnique({ where, include: args?.include });
    },

    async delete(args: any) {
      const params: any[] = [];
      const whereClause = buildWhere(args.where, params, tableName);
      // Get the row before deleting
      const existing = await this.findUnique(args);
      await d1.prepare(`DELETE FROM "${tableName}"${whereClause}`).bind(...params).run();
      return existing;
    },

    async count(args?: any) {
      const params: any[] = [];
      const where = buildWhere(args?.where, params, tableName);
      const sql = `SELECT COUNT(*) as count FROM "${tableName}"${where}`;
      const row = await d1.prepare(sql).bind(...params).first<{ count: number }>();
      return row?.count ?? 0;
    },

    async upsert(args: any) {
      const existing = await this.findUnique({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      }
      return this.create({ data: { ...args.where, ...args.create } });
    },

    async aggregate(args: any) {
      const params: any[] = [];
      const where = buildWhere(args?.where, params, tableName);
      const sums: Record<string, any> = {};

      if (args?._sum) {
        for (const field of Object.keys(args._sum)) {
          const sql = `SELECT SUM("${field}") as val FROM "${tableName}"${where}`;
          const row = await d1.prepare(sql).bind(...params).first<{ val: number | null }>();
          sums[field] = row?.val ?? null;
        }
      }

      return { _sum: sums };
    },

    async updateMany(args: any) {
      const { where, data } = args;
      const params: any[] = [];
      const sets = Object.entries(data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => {
          params.push(toD1Value(v));
          return `"${k}" = ?`;
        })
        .join(", ");
      const whereClause = buildWhere(where, params);
      const result = await d1.prepare(`UPDATE "${tableName}" SET ${sets}${whereClause}`).bind(...params).run();
      return { count: result.meta.changes };
    },
  };
}

// ---------------------------------------------------------------------------
// Simple include resolver (one-level JOINs)
// ---------------------------------------------------------------------------

// Map of known foreign key relationships: model -> field -> { table, fk }
const RELATIONS: Record<string, Record<string, { table: string; fk: string; type: "one" | "many"; through?: string }>> = {
  User: { organization: { table: "Organization", fk: "organizationId", type: "one" } },
  Project: {
    portfolio: { table: "Portfolio", fk: "portfolioId", type: "one" },
    program: { table: "Program", fk: "programId", type: "one" },
    members: { table: "ProjectMember", fk: "projectId", type: "many" },
    sprints: { table: "Sprint", fk: "projectId", type: "many" },
    components: { table: "Component", fk: "projectId", type: "many" },
    labels: { table: "Label", fk: "projectId", type: "many" },
    versions: { table: "Version", fk: "projectId", type: "many" },
    workflows: { table: "WorkflowStatus", fk: "projectId", type: "many" },
  },
  ProjectMember: {
    user: { table: "User", fk: "userId", type: "one" },
  },
  Issue: {
    status: { table: "WorkflowStatus", fk: "statusId", type: "one" },
    component: { table: "Component", fk: "componentId", type: "one" },
    sprint: { table: "Sprint", fk: "sprintId", type: "one" },
    version: { table: "Version", fk: "versionId", type: "one" },
    parent: { table: "Issue", fk: "parentId", type: "one" },
    children: { table: "Issue", fk: "parentId", type: "many" },
    labels: { table: "IssueLabel", fk: "issueId", type: "many" },
    comments: { table: "IssueComment", fk: "issueId", type: "many" },
    attachments: { table: "IssueAttachment", fk: "issueId", type: "many" },
    history: { table: "IssueHistory", fk: "issueId", type: "many" },
    watchers: { table: "IssueWatcher", fk: "issueId", type: "many" },
    timeEntries: { table: "TimeEntry", fk: "issueId", type: "many" },
    linksFrom: { table: "IssueLink", fk: "fromIssueId", type: "many" },
    linksTo: { table: "IssueLink", fk: "toIssueId", type: "many" },
  },
  IssueLabel: {
    label: { table: "Label", fk: "labelId", type: "one" },
  },
  IssueLink: {
    toIssue: { table: "Issue", fk: "toIssueId", type: "one" },
    fromIssue: { table: "Issue", fk: "fromIssueId", type: "one" },
  },
  StrategicCycle: {
    axes: { table: "StrategicAxis", fk: "cycleId", type: "many" },
  },
};

async function resolveIncludes(
  d1: D1Database,
  tableName: string,
  row: Record<string, any>,
  include: Record<string, any>
): Promise<Record<string, any>> {
  const result = { ...row };
  const modelRelations = RELATIONS[tableName] ?? {};

  for (const [relName, relConfig] of Object.entries(include)) {
    if (!relConfig) continue;
    const rel = modelRelations[relName];
    if (!rel) {
      result[relName] = rel === undefined ? null : [];
      continue;
    }

    const nestedInclude = typeof relConfig === "object" && relConfig.include ? relConfig.include : undefined;
    const nestedSelect = typeof relConfig === "object" && relConfig.select ? relConfig.select : undefined;
    const nestedOrderBy = typeof relConfig === "object" && relConfig.orderBy ? relConfig.orderBy : undefined;

    if (rel.type === "one") {
      const fkValue = row[rel.fk];
      if (!fkValue) {
        result[relName] = null;
        continue;
      }
      const sel = nestedSelect ? buildSelect(nestedSelect) : "*";
      const related = await d1.prepare(`SELECT ${sel} FROM "${rel.table}" WHERE "id" = ?`).bind(fkValue).first();
      if (related && nestedInclude) {
        result[relName] = await resolveIncludes(d1, rel.table, related as any, nestedInclude);
      } else {
        result[relName] = related ? parseRow(related as any) : null;
      }
    } else {
      // many relation
      const parentId = row.id;
      const order = buildOrderBy(nestedOrderBy);
      const sel = nestedSelect ? buildSelect(nestedSelect) : "*";
      const related = await d1.prepare(`SELECT ${sel} FROM "${rel.table}" WHERE "${rel.fk}" = ?${order}`).bind(parentId).all();
      let rows = (related.results ?? []).map(parseRow);
      if (nestedInclude) {
        rows = await Promise.all(rows.map((r) => resolveIncludes(d1, rel.table, r, nestedInclude)));
      }
      result[relName] = rows;
    }
  }

  // Handle _count
  if (include._count?.select) {
    const counts: Record<string, number> = {};
    for (const [relName, enabled] of Object.entries(include._count.select)) {
      if (!enabled) continue;
      const rel = modelRelations[relName];
      if (rel && rel.type === "many") {
        const countResult = await d1.prepare(`SELECT COUNT(*) as c FROM "${rel.table}" WHERE "${rel.fk}" = ?`).bind(row.id).first<{ c: number }>();
        counts[relName] = countResult?.c ?? 0;
      }
    }
    result._count = counts;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main proxy factory
// ---------------------------------------------------------------------------

export function createD1PrismaProxy(d1: D1Database): any {
  const modelCache = new Map<string, any>();

  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        // $transaction support
        if (prop === "$transaction") {
          return async (fn: (tx: any) => Promise<any>) => {
            // D1 doesn't have real transactions, but we can pass the same proxy
            // This means transactions aren't truly atomic, but it works for most cases
            const self = createD1PrismaProxy(d1);
            return fn(self);
          };
        }

        if (prop === "$disconnect" || prop === "$connect") {
          return () => Promise.resolve();
        }

        // Convert camelCase model name to PascalCase table name
        const tableName = prop.charAt(0).toUpperCase() + prop.slice(1);

        if (!modelCache.has(tableName)) {
          modelCache.set(tableName, createModelProxy(d1, tableName));
        }
        return modelCache.get(tableName);
      },
    }
  );
}
