import { MigrationInterface, QueryRunner } from "typeorm";

export class AppUserDevice1753285173175 implements MigrationInterface {
    name = 'AppUserDevice1753285173175'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "app_user_device" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "app_user_id" varchar NOT NULL, "device_id" varchar NOT NULL, "firebase_messaging_token" varchar NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "app_user_device"`);
    }
}
