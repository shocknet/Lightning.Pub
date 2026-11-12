import { MigrationInterface, QueryRunner } from "typeorm";

export class RootOpUnique1795000000000 implements MigrationInterface {
    name = 'RootOpUnique1795000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TEMP TABLE "keep_root_operation" AS SELECT MIN("serial_id") AS "serial_id" FROM "root_operation" GROUP BY "operation_type", "operation_identifier"`)
        await queryRunner.query(`DELETE FROM "root_operation" WHERE "serial_id" NOT IN (SELECT "serial_id" FROM "keep_root_operation")`)
        await queryRunner.query(`DROP TABLE "keep_root_operation"`)
        await queryRunner.query(`CREATE UNIQUE INDEX "unique_root_operation" ON "root_operation" ("operation_type", "operation_identifier")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "unique_root_operation"`)
    }
}
