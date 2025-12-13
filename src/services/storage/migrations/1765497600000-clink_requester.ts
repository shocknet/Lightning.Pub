import { MigrationInterface, QueryRunner } from "typeorm";

export class ClinkRequester1765497600000 implements MigrationInterface {
    name = 'ClinkRequester1765497600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if columns already exist (idempotent migration for existing databases)
        const tableInfo = await queryRunner.query(`PRAGMA table_info("user_receiving_invoice")`);
        const hasPubColumn = tableInfo.some((col: any) => col.name === 'clink_requester_pub');
        const hasEventIdColumn = tableInfo.some((col: any) => col.name === 'clink_requester_event_id');
        
        if (!hasPubColumn) {
            await queryRunner.query(`ALTER TABLE "user_receiving_invoice" ADD COLUMN "clink_requester_pub" varchar(64)`);
        }
        if (!hasEventIdColumn) {
            await queryRunner.query(`ALTER TABLE "user_receiving_invoice" ADD COLUMN "clink_requester_event_id" varchar(64)`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_receiving_invoice" DROP COLUMN "clink_requester_pub"`);
        await queryRunner.query(`ALTER TABLE "user_receiving_invoice" DROP COLUMN "clink_requester_event_id"`);
    }

}
