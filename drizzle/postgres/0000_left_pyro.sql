CREATE TABLE "api_usage_counters" (
	"user_id" text NOT NULL,
	"period" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"updated_at" bigint NOT NULL,
	CONSTRAINT "api_usage_counters_user_id_period_pk" PRIMARY KEY("user_id","period")
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"query_param" text NOT NULL,
	"status" text NOT NULL,
	"http_status" integer,
	"place_id" text,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"sector" text NOT NULL,
	"sub_category" text NOT NULL,
	"keyword" text NOT NULL,
	"pitch" text NOT NULL,
	"is_global" boolean DEFAULT false NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"place_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"phone_raw" text,
	"phone_display" text,
	"whatsapp" text,
	"website" text,
	"rating" double precision,
	"reviews" integer DEFAULT 0 NOT NULL,
	"maps_url" text NOT NULL,
	"sector" text NOT NULL,
	"sub_category" text NOT NULL,
	"pitch" text NOT NULL,
	"status" text DEFAULT 'New' NOT NULL,
	"source" text DEFAULT 'SEARCH' NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_usage_counters" ADD CONSTRAINT "api_usage_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_leads" ADD CONSTRAINT "client_leads_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_usage_logs_created_idx" ON "api_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_usage_logs_user_idx" ON "api_usage_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_owner_idx" ON "categories" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "categories_sector_idx" ON "categories" USING btree ("sector");--> statement-breakpoint
CREATE UNIQUE INDEX "client_leads_owner_place_unique" ON "client_leads" USING btree ("owner_id","place_id");--> statement-breakpoint
CREATE INDEX "client_leads_owner_idx" ON "client_leads" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "client_leads_status_idx" ON "client_leads" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");