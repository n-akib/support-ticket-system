import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTicketTable1792214396935 implements MigrationInterface {
    name = 'CreateTicketTable1792214396935'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tickets_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed')`);
        await queryRunner.query(`CREATE TYPE "public"."tickets_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(200) NOT NULL, "description" text NOT NULL, "status" "public"."tickets_status_enum" NOT NULL DEFAULT 'open', "priority" "public"."tickets_priority_enum" NOT NULL DEFAULT 'medium', "category" character varying(100) NOT NULL DEFAULT 'general', "createdById" uuid NOT NULL, "assignedToId" uuid, "dueAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_12b901b34113688b4786368510" ON "tickets"  ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_1cfb61a749963bfba02395e118" ON "tickets"  ("priority") `);
        await queryRunner.query(`CREATE INDEX "IDX_41de538b3eed286f53dd678b03" ON "tickets"  ("createdById") `);
        await queryRunner.query(`CREATE INDEX "IDX_7712f291901ceeb504b329df62" ON "tickets"  ("assignedToId") `);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_41de538b3eed286f53dd678b030" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "FK_7712f291901ceeb504b329df623" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_7712f291901ceeb504b329df623"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "FK_41de538b3eed286f53dd678b030"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7712f291901ceeb504b329df62"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_41de538b3eed286f53dd678b03"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1cfb61a749963bfba02395e118"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_12b901b34113688b4786368510"`);
        await queryRunner.query(`DROP TABLE "tickets"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tickets_status_enum"`);
    }

}
