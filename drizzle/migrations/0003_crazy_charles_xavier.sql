CREATE TYPE "public"."user_role_enum" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role_enum" DEFAULT 'user' NOT NULL;