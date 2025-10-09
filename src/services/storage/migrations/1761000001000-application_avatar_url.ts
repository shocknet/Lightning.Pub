import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationAvatarUrl1761000001000 implements MigrationInterface {
    name = 'ApplicationAvatarUrl1761000001000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "application" ADD COLUMN "avatar_url" varchar`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // SQLite has limited ALTER TABLE support; we can recreate table if needed, but for now just keep it simple
        // No-op: dropping a column is non-trivial; leave column in place on downgrade
    }
}


