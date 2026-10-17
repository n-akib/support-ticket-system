import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCommentTable1792217846899 implements MigrationInterface {
    name = 'CreateCommentTable1792217846899'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "comments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" uuid NOT NULL, "authorId" uuid NOT NULL, "body" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_469fc1a5c6798a3b7a6de4dfc6" ON "comments"  ("ticketId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4548cc4a409b8651ec75f70e28" ON "comments"  ("authorId") `);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_469fc1a5c6798a3b7a6de4dfc6e" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_4548cc4a409b8651ec75f70e280" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_4548cc4a409b8651ec75f70e280"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_469fc1a5c6798a3b7a6de4dfc6e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4548cc4a409b8651ec75f70e28"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_469fc1a5c6798a3b7a6de4dfc6"`);
        await queryRunner.query(`DROP TABLE "comments"`);
    }

}
