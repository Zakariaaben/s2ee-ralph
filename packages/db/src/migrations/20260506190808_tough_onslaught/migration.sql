CREATE TYPE "user_role" AS ENUM('admin', 'student', 'company', 'check-in');--> statement-breakpoint
CREATE TYPE "company_arrival_status" AS ENUM('not-arrived', 'arrived');--> statement-breakpoint
CREATE TYPE "interview_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"role" "user_role" DEFAULT 'student'::"user_role" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" text PRIMARY KEY,
	"owner_user_id" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"room_id" text,
	"stand_number" integer,
	"arrival_status" "company_arrival_status" DEFAULT 'not-arrived'::"company_arrival_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "featured_company" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"logo_label" text NOT NULL,
	"profiles" jsonb NOT NULL,
	"employment_count" integer DEFAULT 0 NOT NULL,
	"worker_internship_count" integer DEFAULT 0 NOT NULL,
	"practical_internship_count" integer DEFAULT 0 NOT NULL,
	"pfe_count" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruiter" (
	"id" text PRIMARY KEY,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_profile" (
	"id" text PRIMARY KEY,
	"student_id" text NOT NULL,
	"profile_type_id" text NOT NULL,
	"profile_type_label" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_interview_tag" (
	"id" text PRIMARY KEY,
	"company_id" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview" (
	"id" text PRIMARY KEY,
	"company_id" text NOT NULL,
	"student_id" text NOT NULL,
	"cv_profile_id" text NOT NULL,
	"recruiter_name" text NOT NULL,
	"status" "interview_status" NOT NULL,
	"score" double precision,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_company_tag" (
	"interview_id" text,
	"company_tag_id" text,
	"company_tag_label" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "interview_company_tag_pkey" PRIMARY KEY("interview_id","company_tag_id")
);
--> statement-breakpoint
CREATE TABLE "interview_global_tag" (
	"interview_id" text,
	"global_tag_id" text,
	"global_tag_label" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "interview_global_tag_pkey" PRIMARY KEY("interview_id","global_tag_id")
);
--> statement-breakpoint
CREATE TABLE "student" (
	"id" text PRIMARY KEY,
	"owner_user_id" text NOT NULL UNIQUE,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone_number" text NOT NULL,
	"academic_year" text NOT NULL,
	"major" text NOT NULL,
	"institution" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_profile_type" (
	"id" text PRIMARY KEY,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_interview_tag" (
	"id" text PRIMARY KEY,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_institution" (
	"id" text PRIMARY KEY,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_major" (
	"id" text PRIMARY KEY,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "published_venue_map" (
	"id" text PRIMARY KEY,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"contents_base64" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "published_venue_map_pin" (
	"room_id" text PRIMARY KEY,
	"x_percent" double precision NOT NULL,
	"y_percent" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room" (
	"id" text PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "company_owner_user_id_idx" ON "company" ("owner_user_id");--> statement-breakpoint
CREATE INDEX "company_room_id_idx" ON "company" ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_room_stand_unique_idx" ON "company" ("room_id","stand_number");--> statement-breakpoint
CREATE INDEX "featured_company_published_sort_idx" ON "featured_company" ("is_published","sort_order");--> statement-breakpoint
CREATE INDEX "featured_company_name_idx" ON "featured_company" ("name");--> statement-breakpoint
CREATE INDEX "recruiter_company_id_idx" ON "recruiter" ("company_id");--> statement-breakpoint
CREATE INDEX "cv_profile_student_id_idx" ON "cv_profile" ("student_id");--> statement-breakpoint
CREATE INDEX "cv_profile_profile_type_id_idx" ON "cv_profile" ("profile_type_id");--> statement-breakpoint
CREATE INDEX "company_interview_tag_company_id_idx" ON "company_interview_tag" ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_interview_tag_company_label_unique_idx" ON "company_interview_tag" ("company_id","label");--> statement-breakpoint
CREATE INDEX "interview_company_id_idx" ON "interview" ("company_id");--> statement-breakpoint
CREATE INDEX "interview_student_id_idx" ON "interview" ("student_id");--> statement-breakpoint
CREATE INDEX "interview_cv_profile_id_idx" ON "interview" ("cv_profile_id");--> statement-breakpoint
CREATE INDEX "interview_status_idx" ON "interview" ("status");--> statement-breakpoint
CREATE INDEX "interview_company_tag_interview_id_idx" ON "interview_company_tag" ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_global_tag_interview_id_idx" ON "interview_global_tag" ("interview_id");--> statement-breakpoint
CREATE INDEX "student_owner_user_id_idx" ON "student" ("owner_user_id");--> statement-breakpoint
CREATE INDEX "cv_profile_type_sort_order_idx" ON "cv_profile_type" ("sort_order");--> statement-breakpoint
CREATE INDEX "global_interview_tag_sort_order_idx" ON "global_interview_tag" ("sort_order");--> statement-breakpoint
CREATE INDEX "student_institution_sort_order_idx" ON "student_institution" ("sort_order");--> statement-breakpoint
CREATE INDEX "student_major_sort_order_idx" ON "student_major" ("sort_order");--> statement-breakpoint
CREATE INDEX "published_venue_map_pin_room_id_idx" ON "published_venue_map_pin" ("room_id");--> statement-breakpoint
CREATE INDEX "room_code_idx" ON "room" ("code");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_owner_user_id_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_room_id_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "recruiter" ADD CONSTRAINT "recruiter_company_id_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "cv_profile" ADD CONSTRAINT "cv_profile_student_id_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company_interview_tag" ADD CONSTRAINT "company_interview_tag_company_id_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_company_id_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_student_id_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "interview" ADD CONSTRAINT "interview_cv_profile_id_cv_profile_id_fkey" FOREIGN KEY ("cv_profile_id") REFERENCES "cv_profile"("id");--> statement-breakpoint
ALTER TABLE "interview_company_tag" ADD CONSTRAINT "interview_company_tag_interview_id_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interview"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "interview_global_tag" ADD CONSTRAINT "interview_global_tag_interview_id_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interview"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student" ADD CONSTRAINT "student_owner_user_id_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "published_venue_map_pin" ADD CONSTRAINT "published_venue_map_pin_room_id_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "room"("id") ON DELETE CASCADE;