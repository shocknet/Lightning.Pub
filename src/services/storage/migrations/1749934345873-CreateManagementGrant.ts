import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm"

export class CreateManagementGrant1749934345873 implements MigrationInterface {
    name = 'CreateManagementGrant1749934345873'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "management_grants",
            columns: [
                {
                    name: "id",
                    type: "varchar",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "uuid"
                },
                {
                    name: "user_id",
                    type: "varchar"
                },
                {
                    name: "app_pubkey",
                    type: "varchar"
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                },
                {
                    name: "expires_at",
                    type: "timestamp",
                    isNullable: true
                }
            ]
        }));

        await queryRunner.createForeignKey("management_grants", new TableForeignKey({
            columnNames: ["user_id"],
            referencedColumnNames: ["user_id"],
            referencedTableName: "user",
            onDelete: "CASCADE"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("management_grants");
    }

}
