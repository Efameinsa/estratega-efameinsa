-- Seed: Organization + Admin user
INSERT OR IGNORE INTO "Organization" ("id", "name", "sector", "country", "plan", "config", "createdAt", "updatedAt")
VALUES ('org-default', 'Organización Demo', 'Tecnología', 'PE', 'free', '{}', datetime('now'), datetime('now'));

INSERT OR IGNORE INTO "User" ("id", "name", "email", "hashedPassword", "role", "organizationId", "active", "createdAt", "updatedAt")
VALUES ('cmnl0z22x0001f388off6sbld', 'Administrador', 'admin@demo.com', '$2b$10$E6.HflyGsotYIsdUqZsIJuxxSFooBfsE1BxrZuOvbSRomFvtwfxD6', 'ADMIN', 'org-default', 1, datetime('now'), datetime('now'));
