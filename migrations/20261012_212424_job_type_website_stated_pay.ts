import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_jobs_employment_type" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN', 'OTHER');
  CREATE TYPE "public"."enum_jobs_pay_unit" AS ENUM('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');
  CREATE TABLE "jobs_employment_type" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_jobs_employment_type",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "jobs" ADD COLUMN "company_website" varchar;
  ALTER TABLE "jobs" ADD COLUMN "pay_unit" "enum_jobs_pay_unit";
  ALTER TABLE "jobs" ADD COLUMN "pay_stated_min" numeric;
  ALTER TABLE "jobs" ADD COLUMN "pay_stated_max" numeric;
  ALTER TABLE "jobs_employment_type" ADD CONSTRAINT "jobs_employment_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "jobs_employment_type_order_idx" ON "jobs_employment_type" USING btree ("order");
  CREATE INDEX "jobs_employment_type_parent_idx" ON "jobs_employment_type" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "jobs_employment_type" CASCADE;
  ALTER TABLE "jobs" DROP COLUMN "company_website";
  ALTER TABLE "jobs" DROP COLUMN "pay_unit";
  ALTER TABLE "jobs" DROP COLUMN "pay_stated_min";
  ALTER TABLE "jobs" DROP COLUMN "pay_stated_max";
  DROP TYPE "public"."enum_jobs_employment_type";
  DROP TYPE "public"."enum_jobs_pay_unit";`)
}
