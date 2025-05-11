import { MigrationInterface, QueryRunner } from "typeorm";

export class RootOpsTime1745428134124 implements MigrationInterface {
    name = 'RootOpsTime1745428134124'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_root_operation" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "operation_type" varchar NOT NULL, "operation_amount" integer NOT NULL, "operation_identifier" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "at_unix" integer NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "temporary_root_operation"("serial_id", "operation_type", "operation_amount", "operation_identifier", "created_at", "updated_at") SELECT "serial_id", "operation_type", "operation_amount", "operation_identifier", "created_at", "updated_at" FROM "root_operation"`);
        await queryRunner.query(`DROP TABLE "root_operation"`);
        await queryRunner.query(`ALTER TABLE "temporary_root_operation" RENAME TO "root_operation"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "root_operation" RENAME TO "temporary_root_operation"`);
        await queryRunner.query(`CREATE TABLE "root_operation" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "operation_type" varchar NOT NULL, "operation_amount" integer NOT NULL, "operation_identifier" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "root_operation"("serial_id", "operation_type", "operation_amount", "operation_identifier", "created_at", "updated_at") SELECT "serial_id", "operation_type", "operation_amount", "operation_identifier", "created_at", "updated_at" FROM "temporary_root_operation"`);
        await queryRunner.query(`DROP TABLE "temporary_root_operation"`);
    }

}
