-- CreateTable
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "sector" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PE',
    "plan" TEXT NOT NULL DEFAULT 'free',
    "config" TEXT NOT NULL DEFAULT '{}',
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MIEMBRO_EQUIPO',
    "area" TEXT,
    "phone" TEXT,
    "profile" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StrategicCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yearStart" INTEGER NOT NULL,
    "yearEnd" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StrategicCycle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Vision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timeHorizon" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "aiScore" REAL,
    "aiAnalysis" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vision_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vision_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "componentsJson" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "approvedById" TEXT,
    "approvedAt" DATETIME,
    "aiScore" REAL,
    "aiAnalysis" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mission_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mission_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Value" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "behaviors" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Value_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EthicsCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EthicsCode_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Interest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "intensity" TEXT NOT NULL,
    "allies" TEXT,
    "neutrals" TEXT,
    "adversaries" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interest_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CardinalPrinciple" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CardinalPrinciple_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PestecFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "variable" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subVarType" TEXT NOT NULL DEFAULT 'primaria',
    "subVarId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'O',
    "impact" INTEGER NOT NULL DEFAULT 3,
    "probability" INTEGER NOT NULL DEFAULT 3,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "hallazgo" TEXT,
    "evidenceChips" TEXT NOT NULL DEFAULT '[]',
    "evidenceNotes" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "includeInMefe" BOOLEAN NOT NULL DEFAULT false,
    "trend" TEXT,
    "source" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PestecFactor_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MefeFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalDescription" TEXT,
    "sourceFactorId" TEXT,
    "type" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "variable" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MefeFactor_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MefeState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'en_construccion',
    "pptFinal" REAL,
    "finalizedAt" DATETIME,
    "finalizedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MefeState_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CompetitiveAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CompetitiveAnalysis_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IndustryAttractiveness" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IndustryAttractiveness_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MpcFactorDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MpcFactorDef_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MpcCompetitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isOwnOrg" BOOLEAN NOT NULL DEFAULT false,
    "totalScore" REAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MpcCompetitor_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MpcScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "competitorId" TEXT NOT NULL,
    "factorDefId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    CONSTRAINT "MpcScore_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "MpcCompetitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MpcScore_factorDefId_fkey" FOREIGN KEY ("factorDefId") REFERENCES "MpcFactorDef" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PorterAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "overallScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PorterAnalysis_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AmofhitArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "findings" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "score" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AmofhitArea_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MefiFactor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalDescription" TEXT,
    "sourceVariableId" TEXT,
    "type" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "rating" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "area" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MefiFactor_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MefiState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'en_construccion',
    "pptFinal" REAL,
    "finalizedAt" DATETIME,
    "finalizedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MefiState_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AreaSynthesis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AreaSynthesis_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InternalReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "diagnosticoGeneral" TEXT,
    "principalesFortalezas" TEXT NOT NULL DEFAULT '[]',
    "principalesDebilidades" TEXT NOT NULL DEFAULT '[]',
    "patronesTransversales" TEXT,
    "implicanciasFormulacion" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InternalReport_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FinancialRatio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT,
    "value" REAL NOT NULL,
    "benchmark" REAL,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinancialRatio_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Olp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT,
    "currentValue" REAL,
    "targetValue" REAL,
    "unit" TEXT,
    "bscPerspective" TEXT,
    "areaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Olp_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "swotQuadrant" TEXT NOT NULL,
    "type" TEXT,
    "matrixAppearances" TEXT,
    "mdFrequency" INTEGER NOT NULL DEFAULT 0,
    "mcpeTotalScore" REAL,
    "rumeltApproved" BOOLEAN,
    "rumeltDetail" TEXT,
    "ethicsApproved" BOOLEAN,
    "ethicsDetail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Strategy_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StrategyOlp" (
    "strategyId" TEXT NOT NULL,
    "olpId" TEXT NOT NULL,

    PRIMARY KEY ("strategyId", "olpId"),
    CONSTRAINT "StrategyOlp_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StrategyOlp_olpId_fkey" FOREIGN KEY ("olpId") REFERENCES "Olp" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PeyeaAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "financialStrength" TEXT NOT NULL DEFAULT '[]',
    "competitiveAdvantage" TEXT NOT NULL DEFAULT '[]',
    "environmentalStability" TEXT NOT NULL DEFAULT '[]',
    "industryStrength" TEXT NOT NULL DEFAULT '[]',
    "vectorX" REAL,
    "vectorY" REAL,
    "quadrant" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PeyeaAnalysis_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "McpeEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "factorType" TEXT NOT NULL,
    "factorDesc" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "pa" INTEGER,
    "tca" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "McpeEvaluation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "McpeEvaluation_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StrategicAxis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StrategicAxis_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Portfolio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "axisId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Portfolio_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "StrategicCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Portfolio_axisId_fkey" FOREIGN KEY ("axisId") REFERENCES "StrategicAxis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Program_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT,
    "programId" TEXT,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Project_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WorkflowStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'TODO',
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "WorkflowStatus_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "leadId" TEXT,
    CONSTRAINT "Component_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Label" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    CONSTRAINT "Label_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Version" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNRELEASED',
    "startDate" DATETIME,
    "releaseDate" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Version_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Sprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sprint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TASK',
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "statusId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "resolution" TEXT,
    "assigneeId" TEXT,
    "reporterId" TEXT,
    "componentId" TEXT,
    "sprintId" TEXT,
    "versionId" TEXT,
    "parentId" TEXT,
    "storyPoints" INTEGER,
    "estimateHours" REAL,
    "timeSpent" REAL DEFAULT 0,
    "startDate" DATETIME,
    "dueDate" DATETIME,
    "resolvedAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Issue_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "WorkflowStatus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IssueLabel" (
    "issueId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    PRIMARY KEY ("issueId", "labelId"),
    CONSTRAINT "IssueLabel_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IssueLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromIssueId" TEXT NOT NULL,
    "toIssueId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueLink_fromIssueId_fkey" FOREIGN KEY ("fromIssueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueLink_toIssueId_fkey" FOREIGN KEY ("toIssueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IssueComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IssueAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IssueHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "userId" TEXT,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueHistory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "IssueWatcher" (
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    PRIMARY KEY ("issueId", "userId"),
    CONSTRAINT "IssueWatcher_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hours" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeEntry_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StrategicCycle_organizationId_idx" ON "StrategicCycle"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vision_cycleId_idx" ON "Vision"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Mission_cycleId_idx" ON "Mission"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Value_cycleId_idx" ON "Value"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EthicsCode_cycleId_idx" ON "EthicsCode"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Interest_cycleId_idx" ON "Interest"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CardinalPrinciple_cycleId_idx" ON "CardinalPrinciple"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PestecFactor_cycleId_idx" ON "PestecFactor"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MefeFactor_cycleId_idx" ON "MefeFactor"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MefeState_cycleId_key" ON "MefeState"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CompetitiveAnalysis_cycleId_key" ON "CompetitiveAnalysis"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IndustryAttractiveness_cycleId_key" ON "IndustryAttractiveness"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MpcFactorDef_cycleId_idx" ON "MpcFactorDef"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MpcCompetitor_cycleId_idx" ON "MpcCompetitor"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MpcScore_competitorId_factorDefId_key" ON "MpcScore"("competitorId", "factorDefId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PorterAnalysis_cycleId_key" ON "PorterAnalysis"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AmofhitArea_cycleId_area_key" ON "AmofhitArea"("cycleId", "area");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MefiFactor_cycleId_idx" ON "MefiFactor"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MefiState_cycleId_key" ON "MefiState"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AreaSynthesis_cycleId_area_idx" ON "AreaSynthesis"("cycleId", "area");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InternalReport_cycleId_idx" ON "InternalReport"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FinancialRatio_cycleId_idx" ON "FinancialRatio"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Olp_cycleId_idx" ON "Olp"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Strategy_cycleId_idx" ON "Strategy"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PeyeaAnalysis_cycleId_key" ON "PeyeaAnalysis"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "McpeEvaluation_cycleId_idx" ON "McpeEvaluation"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "McpeEvaluation_strategyId_idx" ON "McpeEvaluation"("strategyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StrategicAxis_cycleId_idx" ON "StrategicAxis"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Portfolio_cycleId_idx" ON "Portfolio"("cycleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Program_portfolioId_idx" ON "Program"("portfolioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_orgId_idx" ON "Project"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_portfolioId_idx" ON "Project"("portfolioId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Project_programId_idx" ON "Project"("programId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Project_orgId_key_key" ON "Project"("orgId", "key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WorkflowStatus_projectId_idx" ON "WorkflowStatus"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Component_projectId_idx" ON "Component"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Label_projectId_idx" ON "Label"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Version_projectId_idx" ON "Version"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Sprint_projectId_idx" ON "Sprint"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Issue_projectId_idx" ON "Issue"("projectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Issue_assigneeId_idx" ON "Issue"("assigneeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Issue_sprintId_idx" ON "Issue"("sprintId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Issue_parentId_idx" ON "Issue"("parentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Issue_statusId_idx" ON "Issue"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Issue_projectId_number_key" ON "Issue"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IssueLink_fromIssueId_toIssueId_type_key" ON "IssueLink"("fromIssueId", "toIssueId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IssueComment_issueId_idx" ON "IssueComment"("issueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IssueAttachment_issueId_idx" ON "IssueAttachment"("issueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IssueHistory_issueId_idx" ON "IssueHistory"("issueId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TimeEntry_issueId_idx" ON "TimeEntry"("issueId");

