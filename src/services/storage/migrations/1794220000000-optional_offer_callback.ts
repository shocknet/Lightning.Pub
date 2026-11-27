import { MigrationInterface, QueryRunner } from "typeorm"

export class OptionalOfferCallback1794220000000 implements MigrationInterface {
    name = "OptionalOfferCallback1794220000000"

    async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("user_offer")
        const column = table?.findColumnByName("callback_url")
        if (!table || !column) throw new Error("user_offer.callback_url is missing")
        const nullable = column.clone()
        nullable.isNullable = true
        nullable.default = "NULL"
        await queryRunner.changeColumn(table, column, nullable)
        await queryRunner.query(`UPDATE "user_offer" SET "callback_url" = NULL WHERE "callback_url" = ''`)
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "user_offer" SET "callback_url" = '' WHERE "callback_url" IS NULL`)
        const table = await queryRunner.getTable("user_offer")
        const column = table?.findColumnByName("callback_url")
        if (!table || !column) throw new Error("user_offer.callback_url is missing")
        const required = column.clone()
        required.isNullable = false
        required.default = "''"
        await queryRunner.changeColumn(table, column, required)
    }
}
