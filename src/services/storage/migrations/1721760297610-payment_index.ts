import { MigrationInterface, QueryRunner } from "typeorm";

export class PaymentIndex1721760297610 implements MigrationInterface {
    name = 'PaymentIndex1721760297610'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_a609a4d3d8d9b07b90692a3c45"`);
        await queryRunner.query(`CREATE TABLE "temporary_user_invoice_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "paid_amount" integer NOT NULL, "routing_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, "liquidityProvider" varchar, "paymentIndex" integer NOT NULL DEFAULT (-1), CONSTRAINT "FK_ef2aa6761ab681bbbd5f94e0fcb" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6bcac90887eea1dc61d37db2994" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_invoice_payment"("serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider") SELECT "serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider" FROM "user_invoice_payment"`);
        await queryRunner.query(`DROP TABLE "user_invoice_payment"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_invoice_payment" RENAME TO "user_invoice_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a609a4d3d8d9b07b90692a3c45" ON "user_invoice_payment" ("invoice") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_a609a4d3d8d9b07b90692a3c45"`);
        await queryRunner.query(`ALTER TABLE "user_invoice_payment" RENAME TO "temporary_user_invoice_payment"`);
        await queryRunner.query(`CREATE TABLE "user_invoice_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "invoice" varchar NOT NULL, "paid_amount" integer NOT NULL, "routing_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, "liquidityProvider" varchar, CONSTRAINT "FK_ef2aa6761ab681bbbd5f94e0fcb" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6bcac90887eea1dc61d37db2994" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_invoice_payment"("serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider") SELECT "serial_id", "invoice", "paid_amount", "routing_fees", "service_fees", "paid_at_unix", "internal", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId", "liquidityProvider" FROM "temporary_user_invoice_payment"`);
        await queryRunner.query(`DROP TABLE "temporary_user_invoice_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a609a4d3d8d9b07b90692a3c45" ON "user_invoice_payment" ("invoice") `);
    }
}
