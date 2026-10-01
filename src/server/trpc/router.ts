import { router } from "./init";
import { cycleRouter } from "@/server/routers/cycle";
import { visionRouter } from "@/server/routers/vision";
import { missionRouter } from "@/server/routers/mission";
import { valuesRouter, ethicsRouter } from "@/server/routers/values";
import { interestsRouter, cardinalRouter } from "@/server/routers/interests";
import { pestecRouter } from "@/server/routers/pestec";
import { mefeRouter } from "@/server/routers/mefe";
import { mpcRouter } from "@/server/routers/mpc";
import { porterRouter } from "@/server/routers/porter";
import { competitiveAnalysisRouter } from "@/server/routers/competitive-analysis";
import { industryAttractivenessRouter } from "@/server/routers/industry-attractiveness";
import { amofhitRouter } from "@/server/routers/amofhit";
import { mefiRouter } from "@/server/routers/mefi";
import { ratiosRouter } from "@/server/routers/ratios";
import { companyMetricRouter } from "@/server/routers/company-metric";
import { olpRouter } from "@/server/routers/olp";
import { strategyRouter } from "@/server/routers/strategy";
import { fodaCruzadoRouter } from "@/server/routers/foda-cruzado";
import { ieRouter } from "@/server/routers/ie";
import { geRouter } from "@/server/routers/ge";
import { mdRouter } from "@/server/routers/md";
import { mcpeRouter } from "@/server/routers/mcpe";
import { rumeltRouter } from "@/server/routers/rumelt";
import { ethicsAuditRouter } from "@/server/routers/ethics";
import { strategiesRetainedRouter } from "@/server/routers/strategies-retained";
import { peiRouter } from "@/server/routers/pei";
import { presentationRouter } from "@/server/routers/presentation";
import { peyeaRouter } from "@/server/routers/peyea";
import { ocpRouter } from "@/server/routers/ocp";
import { policiesRouter } from "@/server/routers/policies";
import { orgStructureRouter } from "@/server/routers/org-structure";
import { resourcesRouter } from "@/server/routers/resources";
import { kpisRouter } from "@/server/routers/kpis";
import { workspaceTokensRouter } from "@/server/routers/workspace-tokens";
import { dashboardRouter } from "@/server/routers/dashboard";
import { alertsRouter } from "@/server/routers/alerts";
import { reviewsRouter } from "@/server/routers/reviews";
import { userRouter } from "@/server/routers/user";
import { strategicAxisRouter } from "@/server/routers/strategic-axis";
import { portfolioRouter } from "@/server/routers/portfolio";
import { programRouter } from "@/server/routers/program";
import { projectRouter } from "@/server/routers/project";
import { projectConfigRouter } from "@/server/routers/project-config";
import { issueRouter } from "@/server/routers/issue";
import { pmRouter } from "@/server/routers/pm";
import { matrixStateRouter } from "@/server/routers/matrix-state";
import { bcgRouter } from "@/server/routers/bcg";
import { invitationsRouter } from "@/server/routers/invitations";
import { membersRouter } from "@/server/routers/members";
import { onboardingRouter } from "@/server/routers/onboarding";
import { organizationsRouter } from "@/server/routers/organizations";

export const appRouter = router({
  cycle: cycleRouter,
  vision: visionRouter,
  mission: missionRouter,
  values: valuesRouter,
  ethics: ethicsRouter,
  interests: interestsRouter,
  cardinal: cardinalRouter,
  pestec: pestecRouter,
  mefe: mefeRouter,
  mpc: mpcRouter,
  porter: porterRouter,
  competitiveAnalysis: competitiveAnalysisRouter,
  industryAttractiveness: industryAttractivenessRouter,
  amofhit: amofhitRouter,
  mefi: mefiRouter,
  ratios: ratiosRouter,
  companyMetric: companyMetricRouter,
  olp: olpRouter,
  strategy: strategyRouter,
  fodaCruzado: fodaCruzadoRouter,
  ie: ieRouter,
  ge: geRouter,
  md: mdRouter,
  mcpe: mcpeRouter,
  rumelt: rumeltRouter,
  ethicsAudit: ethicsAuditRouter,
  strategiesRetained: strategiesRetainedRouter,
  pei: peiRouter,
  presentation: presentationRouter,
  peyea: peyeaRouter,
  ocp: ocpRouter,
  policies: policiesRouter,
  orgStructure: orgStructureRouter,
  resources: resourcesRouter,
  kpis: kpisRouter,
  workspaceTokens: workspaceTokensRouter,
  dashboard: dashboardRouter,
  alerts: alertsRouter,
  reviews: reviewsRouter,
  user: userRouter,
  strategicAxis: strategicAxisRouter,
  portfolio: portfolioRouter,
  program: programRouter,
  project: projectRouter,
  projectConfig: projectConfigRouter,
  issue: issueRouter,
  pm: pmRouter,
  matrixState: matrixStateRouter,
  bcg: bcgRouter,
  invitations: invitationsRouter,
  members: membersRouter,
  onboarding: onboardingRouter,
  organizations: organizationsRouter,
});

export type AppRouter = typeof appRouter;
