-- CreateEnum
CREATE TYPE "ModelSource" AS ENUM ('MANUAL', 'OPENROUTER');

-- AlterTable
ALTER TABLE "Model"
  ADD COLUMN "source" "ModelSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "inputRubPer1M" DECIMAL(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN "outputRubPer1M" DECIMAL(14,4) NOT NULL DEFAULT 0;

-- Index for fast filtering of imported vs manual models
CREATE INDEX "Model_source_idx" ON "Model"("source");
