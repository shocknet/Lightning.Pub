import { MigrationInterface, QueryRunner } from "typeorm";

export class UserReceivingInvoiceIdx1753109184611 implements MigrationInterface {
    name = 'UserReceivingInvoiceIdx1753109184611'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "recv_invoice_paid_serial" ON "user_receiving_invoice" ("userSerialId", "paid_at_unix", "serial_id") WHERE paid_at_unix > 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "recv_invoice_paid_serial"`);
    }

}
