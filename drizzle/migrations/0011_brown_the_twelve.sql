CREATE TABLE "guest_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_id" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "guest_sessions_guest_id_unique" UNIQUE("guest_id")
);
--> statement-breakpoint
ALTER TABLE "carts" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "guest_id" varchar(255);--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_email" varchar(255);--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "guest_id" varchar(255);