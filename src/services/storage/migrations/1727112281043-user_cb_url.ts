import { MigrationInterface, QueryRunner } from "typeorm";

export class UserCbUrl1727112281043 implements MigrationInterface {
    name = 'UserCbUrl1727112281043'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_0a0dbb25a73306b037dec82251"`);
        await queryRunner.query(`CREATE TABLE "temporary_application_user" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "identifier" varchar NOT NULL, "nostr_public_key" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "applicationSerialId" integer, "callback_url" varchar NOT NULL DEFAULT (''), CONSTRAINT "REL_0796a381bcc624f52e9a155712" UNIQUE ("userSerialId"), CONSTRAINT "UQ_3175dc397c8285d1e532554dea5" UNIQUE ("nostr_public_key"), CONSTRAINT "FK_1b3bdb6f660cd99533a1e673ef1" FOREIGN KEY ("applicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_0796a381bcc624f52e9a155712b" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_application_user"("serial_id", "identifier", "nostr_public_key", "created_at", "updated_at", "userSerialId", "applicationSerialId") SELECT "serial_id", "identifier", "nostr_public_key", "created_at", "updated_at", "userSerialId", "applicationSerialId" FROM "application_user"`);
        await queryRunner.query(`DROP TABLE "application_user"`);
        await queryRunner.query(`ALTER TABLE "temporary_application_user" RENAME TO "application_user"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0a0dbb25a73306b037dec82251" ON "application_user" ("identifier") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_0a0dbb25a73306b037dec82251"`);
        await queryRunner.query(`ALTER TABLE "application_user" RENAME TO "temporary_application_user"`);
        await queryRunner.query(`CREATE TABLE "application_user" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "identifier" varchar NOT NULL, "nostr_public_key" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "applicationSerialId" integer, CONSTRAINT "REL_0796a381bcc624f52e9a155712" UNIQUE ("userSerialId"), CONSTRAINT "UQ_3175dc397c8285d1e532554dea5" UNIQUE ("nostr_public_key"), CONSTRAINT "FK_1b3bdb6f660cd99533a1e673ef1" FOREIGN KEY ("applicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_0796a381bcc624f52e9a155712b" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "application_user"("serial_id", "identifier", "nostr_public_key", "created_at", "updated_at", "userSerialId", "applicationSerialId") SELECT "serial_id", "identifier", "nostr_public_key", "created_at", "updated_at", "userSerialId", "applicationSerialId" FROM "temporary_application_user"`);
        await queryRunner.query(`DROP TABLE "temporary_application_user"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0a0dbb25a73306b037dec82251" ON "application_user" ("identifier") `);
    }

}
