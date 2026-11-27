import { MigrationInterface, QueryRunner } from "typeorm";

export class UserInvoicePaymentFailure1796300000000 implements MigrationInterface {
    name = 'UserInvoicePaymentFailure1796300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_invoice_payment" ADD COLUMN "failure_reason" varchar NOT NULL DEFAULT ('')`);
        await queryRunner.query(`ALTER TABLE "user_invoice_payment" ADD COLUMN "dest_pubkey" varchar NOT NULL DEFAULT ('')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_invoice_payment" DROP COLUMN "dest_pubkey"`);
        await queryRunner.query(`ALTER TABLE "user_invoice_payment" DROP COLUMN "failure_reason"`);
    }
}
