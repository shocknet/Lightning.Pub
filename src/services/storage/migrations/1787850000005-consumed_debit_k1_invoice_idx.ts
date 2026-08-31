import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsumedDebitK1InvoiceIdx1787850000005 implements MigrationInterface {
    name = 'ConsumedDebitK1InvoiceIdx1787850000005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "consumed_debit_k1_invoice" ON "consumed_debit_k1" ("invoice")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "consumed_debit_k1_invoice"`);
    }
}
