import { MigrationInterface, QueryRunner } from "typeorm";

export class ClinkRequester1765354000000 implements MigrationInterface {
    name = 'ClinkRequester1765354000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_receiving_invoice" ADD COLUMN "clink_requester" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_receiving_invoice" DROP COLUMN "clink_requester"`);
    }

}

