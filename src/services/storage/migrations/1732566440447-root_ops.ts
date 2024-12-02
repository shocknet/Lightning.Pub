import { MigrationInterface, QueryRunner } from "typeorm";

export class RootOps1732566440447 implements MigrationInterface {
    name = 'RootOps1732566440447'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "root_operation" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "operation_type" varchar NOT NULL, "operation_amount" integer NOT NULL, "operation_identifier" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "root_operation"`);
    }

}
