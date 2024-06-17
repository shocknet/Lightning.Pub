import { MigrationInterface, QueryRunner } from "typeorm";

export class LspOrder1718387847693 implements MigrationInterface {
    name = 'LspOrder1718387847693'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "lsp_order" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "service_name" varchar NOT NULL, "invoice" varchar NOT NULL, "order_id" varchar NOT NULL, "total_paid" integer NOT NULL, "fees" integer NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "lsp_order"`);
    }

}
