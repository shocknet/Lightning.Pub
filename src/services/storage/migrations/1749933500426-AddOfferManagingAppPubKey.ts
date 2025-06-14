import { MigrationInterface, QueryRunner } from "typeorm"

export class AddOfferManagingAppPubKey1749933500426 implements MigrationInterface {
    name = 'AddOfferManagingAppPubKey1749933500426'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_offer" ADD "managing_app_pubkey" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_offer" DROP COLUMN "managing_app_pubkey"`);
    }

}
