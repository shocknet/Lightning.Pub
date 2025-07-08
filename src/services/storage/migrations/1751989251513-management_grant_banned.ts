import { MigrationInterface, QueryRunner } from "typeorm";

export class ManagementGrantBanned1751989251513 implements MigrationInterface {
    name = 'ManagementGrantBanned1751989251513'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_management_grant" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "app_pubkey" varchar NOT NULL, "expires_at_unix" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "banned" boolean NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_management_grant"("serial_id", "app_user_id", "app_pubkey", "expires_at_unix", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "app_pubkey", "expires_at_unix", "created_at", "updated_at" FROM "management_grant"`);
        await queryRunner.query(`DROP TABLE "management_grant"`);
        await queryRunner.query(`ALTER TABLE "temporary_management_grant" RENAME TO "management_grant"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "management_grant" RENAME TO "temporary_management_grant"`);
        await queryRunner.query(`CREATE TABLE "management_grant" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "app_pubkey" varchar NOT NULL, "expires_at_unix" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "management_grant"("serial_id", "app_user_id", "app_pubkey", "expires_at_unix", "created_at", "updated_at") SELECT "serial_id", "app_user_id", "app_pubkey", "expires_at_unix", "created_at", "updated_at" FROM "temporary_management_grant"`);
        await queryRunner.query(`DROP TABLE "temporary_management_grant"`);
    }

}
