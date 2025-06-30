import { MigrationInterface, QueryRunner } from "typeorm";

export class ManagementGrant1751307732346 implements MigrationInterface {
    name = 'ManagementGrant1751307732346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "management_grant" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "app_pubkey" varchar NOT NULL, "expires_at_unix" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "temporary_user_offer" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "offer_id" varchar NOT NULL, "label" varchar NOT NULL, "price_sats" integer NOT NULL DEFAULT (0), "callback_url" varchar NOT NULL DEFAULT (''), "expected_data" text, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "management_pubkey" varchar NOT NULL DEFAULT (''), CONSTRAINT "UQ_478f72095abd8a516d3a309a5c5" UNIQUE ("offer_id"))`);
        await queryRunner.query(`INSERT INTO "temporary_user_offer"("serial_id", "app_user_id", "offer_id", "label", "price_sats", "callback_url", "expected_data", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "offer_id", "label", "price_sats", "callback_url", "expected_data", "created_at", "updated_at" FROM "user_offer"`);
        await queryRunner.query(`DROP TABLE "user_offer"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_offer" RENAME TO "user_offer"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_offer" RENAME TO "temporary_user_offer"`);
        await queryRunner.query(`CREATE TABLE "user_offer" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "offer_id" varchar NOT NULL, "label" varchar NOT NULL, "price_sats" integer NOT NULL DEFAULT (0), "callback_url" varchar NOT NULL DEFAULT (''), "expected_data" text, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_478f72095abd8a516d3a309a5c5" UNIQUE ("offer_id"))`);
        await queryRunner.query(`INSERT INTO "user_offer"("serial_id", "app_user_id", "offer_id", "label", "price_sats", "callback_url", "expected_data", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "offer_id", "label", "price_sats", "callback_url", "expected_data", "created_at", "updated_at" FROM "temporary_user_offer"`);
        await queryRunner.query(`DROP TABLE "temporary_user_offer"`);
        await queryRunner.query(`DROP TABLE "management_grant"`);
    }

}
