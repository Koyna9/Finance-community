import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_jobs_category" AS ENUM('leadership', 'tax', 'audit', 'treasury', 'risk-compliance', 'investment', 'fpa', 'accounting');
  CREATE TYPE "public"."enum_jobs_level" AS ENUM('entry', 'mid', 'senior', 'lead');
  CREATE TYPE "public"."enum_jobs_status" AS ENUM('open', 'closed');
  CREATE TYPE "public"."enum_category_pages_key" AS ENUM('leadership', 'tax', 'audit', 'treasury', 'risk-compliance', 'investment', 'fpa', 'accounting');
  CREATE TABLE "jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source_id" numeric NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"clean_title" varchar NOT NULL,
  	"title_slug" varchar,
  	"company" varchar,
  	"company_slug" varchar,
  	"logo" varchar,
  	"company_industry" varchar,
  	"company_size" varchar,
  	"category" "enum_jobs_category" NOT NULL,
  	"level" "enum_jobs_level" NOT NULL,
  	"state" varchar,
  	"state_slug" varchar,
  	"city" varchar,
  	"city_slug" varchar,
  	"is_remote" boolean DEFAULT false,
  	"work_arrangement" varchar,
  	"pay_min" numeric,
  	"pay_max" numeric,
  	"summary" varchar,
  	"requirements" varchar,
  	"description" varchar,
  	"apply_url" varchar,
  	"date_posted" timestamp(3) with time zone,
  	"status" "enum_jobs_status" DEFAULT 'open' NOT NULL,
  	"hidden" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "category_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" "enum_category_pages_key" NOT NULL,
  	"intro" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sync_runs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ran_at" timestamp(3) with time zone NOT NULL,
  	"added" numeric DEFAULT 0,
  	"closed" numeric DEFAULT 0,
  	"error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"jobs_id" integer,
  	"category_pages_id" integer,
  	"sync_runs_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_text" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"home_headline" varchar,
  	"home_subline" varchar,
  	"default_seo_description" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_jobs_fk" FOREIGN KEY ("jobs_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_category_pages_fk" FOREIGN KEY ("category_pages_id") REFERENCES "public"."category_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sync_runs_fk" FOREIGN KEY ("sync_runs_id") REFERENCES "public"."sync_runs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "jobs_source_id_idx" ON "jobs" USING btree ("source_id");
  CREATE UNIQUE INDEX "jobs_slug_idx" ON "jobs" USING btree ("slug");
  CREATE INDEX "jobs_title_slug_idx" ON "jobs" USING btree ("title_slug");
  CREATE INDEX "jobs_company_slug_idx" ON "jobs" USING btree ("company_slug");
  CREATE INDEX "jobs_category_idx" ON "jobs" USING btree ("category");
  CREATE INDEX "jobs_level_idx" ON "jobs" USING btree ("level");
  CREATE INDEX "jobs_state_slug_idx" ON "jobs" USING btree ("state_slug");
  CREATE INDEX "jobs_city_slug_idx" ON "jobs" USING btree ("city_slug");
  CREATE INDEX "jobs_date_posted_idx" ON "jobs" USING btree ("date_posted");
  CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");
  CREATE INDEX "jobs_hidden_idx" ON "jobs" USING btree ("hidden");
  CREATE INDEX "jobs_updated_at_idx" ON "jobs" USING btree ("updated_at");
  CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");
  CREATE INDEX "status_hidden_category_stateSlug_citySlug_idx" ON "jobs" USING btree ("status","hidden","category","state_slug","city_slug");
  CREATE INDEX "status_hidden_stateSlug_citySlug_idx" ON "jobs" USING btree ("status","hidden","state_slug","city_slug");
  CREATE INDEX "status_hidden_level_idx" ON "jobs" USING btree ("status","hidden","level");
  CREATE UNIQUE INDEX "category_pages_key_idx" ON "category_pages" USING btree ("key");
  CREATE INDEX "category_pages_updated_at_idx" ON "category_pages" USING btree ("updated_at");
  CREATE INDEX "category_pages_created_at_idx" ON "category_pages" USING btree ("created_at");
  CREATE INDEX "sync_runs_updated_at_idx" ON "sync_runs" USING btree ("updated_at");
  CREATE INDEX "sync_runs_created_at_idx" ON "sync_runs" USING btree ("created_at");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("jobs_id");
  CREATE INDEX "payload_locked_documents_rels_category_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("category_pages_id");
  CREATE INDEX "payload_locked_documents_rels_sync_runs_id_idx" ON "payload_locked_documents_rels" USING btree ("sync_runs_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "jobs" CASCADE;
  DROP TABLE "category_pages" CASCADE;
  DROP TABLE "sync_runs" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_text" CASCADE;
  DROP TYPE "public"."enum_jobs_category";
  DROP TYPE "public"."enum_jobs_level";
  DROP TYPE "public"."enum_jobs_status";
  DROP TYPE "public"."enum_category_pages_key";`)
}
