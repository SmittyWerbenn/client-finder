CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"user_id" text,
	"plan_id" text NOT NULL,
	"plan_name" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"company" text,
	"doku_payment_url" text,
	"doku_token_id" text,
	"doku_request_id" text,
	"channel" text,
	"paid_at" bigint,
	"expires_at" bigint,
	"notification_payload" text,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_invoice_unique" ON "orders" USING btree ("invoice_number");
--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
