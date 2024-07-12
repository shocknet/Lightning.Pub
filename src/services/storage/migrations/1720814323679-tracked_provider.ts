import { MigrationInterface, QueryRunner } from "typeorm";

export class TrackedProvider1720814323679 implements MigrationInterface {
    name = 'TrackedProvider1720814323679'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tracked_provider" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "provider_type" varchar NOT NULL, "provider_pubkey" varchar NOT NULL, "latest_balance" integer NOT NULL, "latest_distruption_at_unix" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "tracked_provider_unique" ON "tracked_provider" ("provider_type", "provider_pubkey") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "tracked_provider_unique"`);
        await queryRunner.query(`DROP TABLE "tracked_provider"`);
    }

}
