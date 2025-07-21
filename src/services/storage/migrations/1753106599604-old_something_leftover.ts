import { MigrationInterface, QueryRunner } from "typeorm";


// Remove the old left over column "something" from user_transaction_payment
export class OldSomethingLeftover1753106599604 implements MigrationInterface {
    name = 'OldSomethingLeftover1753106599604'
    

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "user_transaction_unique"`);
        await queryRunner.query(`CREATE TABLE "temporary_user_transaction_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "address" varchar NOT NULL, "tx_hash" varchar NOT NULL, "output_index" integer NOT NULL, "paid_amount" integer NOT NULL, "chain_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "confs" integer NOT NULL DEFAULT (0), "broadcast_height" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, CONSTRAINT "FK_75abdd29270979e901da0dba7b9" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6f24c901b4103f7146eb615a5db" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_user_transaction_payment"("serial_id", "address", "tx_hash", "output_index", "paid_amount", "chain_fees", "service_fees", "paid_at_unix", "internal", "confs", "broadcast_height", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId") SELECT "serial_id", "address", "tx_hash", "output_index", "paid_amount", "chain_fees", "service_fees", "paid_at_unix", "internal", "confs", "broadcast_height", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId" FROM "user_transaction_payment"`);
        await queryRunner.query(`DROP TABLE "user_transaction_payment"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_transaction_payment" RENAME TO "user_transaction_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "user_transaction_unique" ON "user_transaction_payment" ("tx_hash", "output_index") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "user_transaction_unique"`);
        await queryRunner.query(`ALTER TABLE "user_transaction_payment" RENAME TO "temporary_user_transaction_payment"`);
        await queryRunner.query(`CREATE TABLE "user_transaction_payment" ("serial_id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "address" varchar NOT NULL, "tx_hash" varchar NOT NULL, "output_index" integer NOT NULL, "paid_amount" integer NOT NULL, "chain_fees" integer NOT NULL, "service_fees" integer NOT NULL, "paid_at_unix" integer NOT NULL, "internal" boolean NOT NULL DEFAULT (0), "confs" integer NOT NULL DEFAULT (0), "broadcast_height" integer NOT NULL DEFAULT (0), "something" integer NOT NULL DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "userSerialId" integer, "linkedApplicationSerialId" integer, CONSTRAINT "FK_75abdd29270979e901da0dba7b9" FOREIGN KEY ("linkedApplicationSerialId") REFERENCES "application" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_6f24c901b4103f7146eb615a5db" FOREIGN KEY ("userSerialId") REFERENCES "user" ("serial_id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "user_transaction_payment"("serial_id", "address", "tx_hash", "output_index", "paid_amount", "chain_fees", "service_fees", "paid_at_unix", "internal", "confs", "broadcast_height", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId") SELECT "serial_id", "address", "tx_hash", "output_index", "paid_amount", "chain_fees", "service_fees", "paid_at_unix", "internal", "confs", "broadcast_height", "created_at", "updated_at", "userSerialId", "linkedApplicationSerialId" FROM "temporary_user_transaction_payment"`);
        await queryRunner.query(`DROP TABLE "temporary_user_transaction_payment"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "user_transaction_unique" ON "user_transaction_payment" ("tx_hash", "output_index") `);
    }

}
