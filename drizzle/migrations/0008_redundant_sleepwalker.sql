ALTER TABLE "products" RENAME COLUMN "in_stock" TO "cutting_in_stock";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seedling_in_stock" boolean DEFAULT false;