import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInviteTokenTable1721751414878 implements MigrationInterface {
    name = 'CreateInviteTokenTable1721751414878'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "invite_token" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "inviteToken" varchar NOT NULL, "sats" integer, "used" boolean NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "applicationSerialId" integer, CONSTRAINT "UQ_0ded0098656758c761f14a43c58" UNIQUE ("inviteToken"))`);
        await queryRunner.query(`CREATE INDEX "IDX_invite_token" ON "invite_token" ("inviteToken") `);
        await queryRunner.query(`DROP INDEX "IDX_invite_token"`);
        await queryRunner.query(`CREATE TABLE "temporary_invite_token" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "inviteToken" varchar NOT NULL, "sats" integer, "used" boolean NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "applicationSerialId" integer, CONSTRAINT "UQ_0ded0098656758c761f14a43c58" UNIQUE ("inviteToken"), CONSTRAINT "FK_a1f025b46b1438eae2a08932169" FOREIGN KEY ("applicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_invite_token"("serial_id", "inviteToken", "sats", "used", "created_at", "updated_at", "applicationSerialId") SELECT "serial_id", "inviteToken", "sats", "used", "created_at", "updated_at", "applicationSerialId" FROM "invite_token"`);
        await queryRunner.query(`DROP TABLE "invite_token"`);
        await queryRunner.query(`ALTER TABLE "temporary_invite_token" RENAME TO "invite_token"`);
        await queryRunner.query(`CREATE INDEX "IDX_invite_token" ON "invite_token" ("inviteToken") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_invite_token"`);
        await queryRunner.query(`ALTER TABLE "invite_token" RENAME TO "temporary_invite_token"`);
        await queryRunner.query(`CREATE TABLE "invite_token" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "inviteToken" varchar NOT NULL, "sats" integer, "used" boolean NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "applicationSerialId" integer, CONSTRAINT "UQ_0ded0098656758c761f14a43c58" UNIQUE ("inviteToken"))`);
        await queryRunner.query(`INSERT INTO "invite_token"("serial_id", "inviteToken", "sats", "used", "created_at", "updated_at", "applicationSerialId") SELECT "serial_id", "inviteToken", "sats", "used", "created_at", "updated_at", "applicationSerialId" FROM "temporary_invite_token"`);
        await queryRunner.query(`DROP TABLE "temporary_invite_token"`);
        await queryRunner.query(`CREATE INDEX "IDX_invite_token" ON "invite_token" ("inviteToken") `);
        await queryRunner.query(`DROP INDEX "IDX_invite_token"`);
        await queryRunner.query(`DROP TABLE "invite_token"`);
    }

}
