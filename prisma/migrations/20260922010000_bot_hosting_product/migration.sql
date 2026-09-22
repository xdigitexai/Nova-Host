ALTER TABLE "Deployment" ALTER COLUMN "subscriptionId" DROP NOT NULL;
ALTER TABLE "Deployment" ADD COLUMN "cost" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Deployment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE "Deployment" ADD COLUMN "renewalCost" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Deployment" ADD COLUMN "renewsAt" TIMESTAMP(3);

CREATE TABLE "DeploymentPrice" (
    "id" TEXT NOT NULL,
    "botKey" TEXT,
    "countryId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "renewalAmount" DECIMAL(18,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeploymentPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeploymentPrice_botKey_countryId_key" ON "DeploymentPrice"("botKey", "countryId");
CREATE INDEX "DeploymentPrice_countryId_active_idx" ON "DeploymentPrice"("countryId", "active");
ALTER TABLE "DeploymentPrice" ADD CONSTRAINT "DeploymentPrice_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
