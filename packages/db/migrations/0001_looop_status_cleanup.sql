-- Migration: Looop status cleanup
-- Reduces looop_contracts.status from 12 values to 5:
--   applied / cancelled / matching_error / terminated / completed
--
-- Mapping:
--   not_proposed, proposed, interested, under_review -> applied
--   contracted, opened                               -> completed
--   error                                            -> matching_error
--   refund_target, excluded                          -> cancelled
--   cancelled, terminated, matching_error, completed, applied -> unchanged

UPDATE "looop_contracts"
SET "status" = 'applied'
WHERE "status" IN ('not_proposed', 'proposed', 'interested', 'under_review');
--> statement-breakpoint

UPDATE "looop_contracts"
SET "status" = 'completed'
WHERE "status" IN ('contracted', 'opened');
--> statement-breakpoint

UPDATE "looop_contracts"
SET "status" = 'matching_error'
WHERE "status" = 'error';
--> statement-breakpoint

UPDATE "looop_contracts"
SET "status" = 'cancelled'
WHERE "status" IN ('refund_target', 'excluded');
--> statement-breakpoint

-- Update the column default to reflect the new baseline status
ALTER TABLE "looop_contracts" ALTER COLUMN "status" SET DEFAULT 'applied';
