ALTER TABLE "products" ALTER COLUMN "cutting_in_stock" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "cutting_in_stock" SET DATA TYPE integer USING cutting_in_stock::integer;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "cutting_in_stock" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "seedling_in_stock" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "seedling_in_stock" SET DATA TYPE integer USING seedling_in_stock::integer;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "seedling_in_stock" SET DEFAULT 0;
