import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlindToUserOffer1760000000000 implements MigrationInterface {
    name = 'AddBlindToUserOffer1760000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_offer" ADD COLUMN "blind" boolean NOT NULL DEFAULT (0)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_offer" DROP COLUMN "blind"`);
    }

}
