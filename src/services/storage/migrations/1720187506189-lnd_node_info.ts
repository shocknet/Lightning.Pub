import { MigrationInterface, QueryRunner } from "typeorm";

export class LndNodeInfo1720187506189 implements MigrationInterface {
    name = 'LndNodeInfo1720187506189'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lnd_node_info" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "pubkey" varchar NOT NULL, "seed" varchar, "backup" varchar, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "lnd_node_info"`);
    }

}
