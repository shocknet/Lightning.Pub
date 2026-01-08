import { MigrationInterface, QueryRunner } from "typeorm";

export class TrackedProviderHeight1766504040000 implements MigrationInterface {
    name = 'TrackedProviderHeight1766504040000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracked_provider" ADD "latest_checked_height" integer NOT NULL DEFAULT (0)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracked_provider" DROP COLUMN "latest_checked_height"`);
    }
}

