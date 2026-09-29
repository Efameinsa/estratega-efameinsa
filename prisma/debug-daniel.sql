SELECT
  u.email,
  u.id AS "userId",
  u."organizationId" AS "userOrgId",
  u."activeOrganizationId" AS "activeOrgId",
  u."onboardingCompleted",
  u."onboardingStep"
FROM "User" u
WHERE u.email = 'daniel@gmail.com';
