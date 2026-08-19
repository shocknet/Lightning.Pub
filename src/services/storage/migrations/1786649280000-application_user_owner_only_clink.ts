import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationUserOwnerOnlyClink1786649280000 implements MigrationInterface {
    name = 'ApplicationUserOwnerOnlyClink1786649280000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "application_user" ADD COLUMN "owner_only_clink" boolean NOT NULL DEFAULT (0)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
