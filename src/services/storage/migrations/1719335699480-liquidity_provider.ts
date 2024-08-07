import { MigrationInterface, QueryRunner } from "typeorm";

export class LiquidityProvider1719335699480 implements MigrationInterface {
    name = 'LiquidityProvider1719335699480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_a131e6b58f084f1340538681b5"`);
        await queryRunner.query(`CREATE TABLE "temporary_user_receiving_invoice" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "expires_at_unix" integer NOT NULL, "paid_at_unix" integer NOT NULL DEFAULT (0), "internal" boolean NOT NULL DEFAULT (0), "paidByLnd" boolean NOT NULL DEFAULT (0), "callbackUrl" varchar NOT NULL DEFAULT (''), "paid_amount" integer NOT NULL DEFAULT (0), "service_fee" integer NOT NULL DEFAULT (0), "zap_info" text, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "productProductId" varchar, "payerSerialId" integer, "linkedApplicationSerialId" integer, "liquidityProvider" varchar, CONSTRAINT "FK_714a8b7d4f89f8a802ca181b789" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_d4bb1e4c60e8a869f1f43ca2e31" FOREIGN KEY ("payerSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_5263bde2a519db9ea608b702ec8" FOREIGN KEY ("productProductId") REFERENCES "product" ("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_2c0dfb3483f3e5e7e3cdd5dc71f" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_receiving_invoice"("serial_id", "invoice", "expires_at_unix", "paid_at_unix", "internal", "paidByLnd", "callbackUrl", "paid_amount", "service_fee", "zap_info", "created_at", "updated_at", "userSerialId", "productProductId", "payerSerialId", "linkedApplicationSerialId") SELECT "serial_id", "invoice", "expires_at_unix", "paid_at_unix", "internal", "paidByLnd", "callbackUrl", "paid_amount", "service_fee", "zap_info", "created_at", "updated_at", "userSerialId", "productProductId", "payerSerialId", "linkedApplicationSerialId" FROM "user_receiving_invoice"`);
        await queryRunner.query(`DROP TABLE "user_receiving_invoice"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_receiving_invoice" RENAME TO "user_receiving_invoice"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a131e6b58f084f1340538681b5" ON "user_receiving_invoice" ("invoice") `);
        await queryRunner.query(`DROP INDEX "IDX_a609a4d3d8d9b07b90692a3c45"`);
        await queryRunner.query(`CREATE TABLE "temporary_user_invoice_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "paid_amount" integer NOT NULL, "routing_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, "liquidityProvider" varchar, CONSTRAINT "FK_6bcac90887eea1dc61d37db2994" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_ef2aa6761ab681bbbd5f94e0fcb" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_invoice_payment"("serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId") SELECT "serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId" FROM "user_invoice_payment"`);
        await queryRunner.query(`DROP TABLE "user_invoice_payment"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_invoice_payment" RENAME TO "user_invoice_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a609a4d3d8d9b07b90692a3c45" ON "user_invoice_payment" ("invoice") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_a609a4d3d8d9b07b90692a3c45"`);
        await queryRunner.query(`ALTER TABLE "user_invoice_payment" RENAME TO "temporary_user_invoice_payment"`);
        await queryRunner.query(`CREATE TABLE "user_invoice_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "paid_amount" integer NOT NULL, "routing_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, CONSTRAINT "FK_6bcac90887eea1dc61d37db2994" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_ef2aa6761ab681bbbd5f94e0fcb" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_invoice_payment"("serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId") SELECT "serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId" FROM "temporary_user_invoice_payment"`);
        await queryRunner.query(`DROP TABLE "temporary_user_invoice_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a609a4d3d8d9b07b90692a3c45" ON "user_invoice_payment" ("invoice") `);
        await queryRunner.query(`DROP INDEX "IDX_a131e6b58f084f1340538681b5"`);
        await queryRunner.query(`ALTER TABLE "user_receiving_invoice" RENAME TO "temporary_user_receiving_invoice"`);
        await queryRunner.query(`CREATE TABLE "user_receiving_invoice" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "expires_at_unix" integer NOT NULL, "paid_at_unix" integer NOT NULL DEFAULT (0), "internal" boolean NOT NULL DEFAULT (0), "paidByLnd" boolean NOT NULL DEFAULT (0), "callbackUrl" varchar NOT NULL DEFAULT (''), "paid_amount" integer NOT NULL DEFAULT (0), "service_fee" integer NOT NULL DEFAULT (0), "zap_info" text, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "productProductId" varchar, "payerSerialId" integer, "linkedApplicationSerialId" integer, CONSTRAINT "FK_714a8b7d4f89f8a802ca181b789" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_d4bb1e4c60e8a869f1f43ca2e31" FOREIGN KEY ("payerSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_5263bde2a519db9ea608b702ec8" FOREIGN KEY ("productProductId") REFERENCES "product" ("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_2c0dfb3483f3e5e7e3cdd5dc71f" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_receiving_invoice"("serial_id", "invoice", "expires_at_unix", "paid_at_unix", "internal", "paidByLnd", "callbackUrl", "paid_amount", "service_fee", "zap_info", "created_at", "updated_at", "userSerialId", "productProductId", "payerSerialId", "linkedApplicationSerialId") SELECT "serial_id", "invoice", "expires_at_unix", "paid_at_unix", "internal", "paidByLnd", "callbackUrl", "paid_amount", "service_fee", "zap_info", "created_at", "updated_at", "userSerialId", "productProductId", "payerSerialId", "linkedApplicationSerialId" FROM "temporary_user_receiving_invoice"`);
        await queryRunner.query(`DROP TABLE "temporary_user_receiving_invoice"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a131e6b58f084f1340538681b5" ON "user_receiving_invoice" ("invoice") `);
    }

}
