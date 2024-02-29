import { MigrationInterface, QueryRunner } from "typeorm";

export class HtlcErrors1709149327598 implements MigrationInterface {
    name = 'HtlcErrors1709149327598'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "htlc_failures" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "key" varchar NOT NULL, "value" text NOT NULL, "version" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_40f71cd66bed693e826d91d438" ON "htlc_failures" ("key") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_40f71cd66bed693e826d91d438"`);
        await queryRunner.query(`DROP TABLE "htlc_failures"`);
    }

}
