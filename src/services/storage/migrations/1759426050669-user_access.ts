import { MigrationInterface, QueryRunner } from "typeorm";

export class UserAccess1759426050669 implements MigrationInterface {
    name = 'UserAccess1759426050669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_access" ("user_id" varchar PRIMARY KEY NOT NULL, "last_seen_at_unix" integer NOT NULL DEFAULT (0), "locked" boolean NOT NULL DEFAULT (0))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user_access"`);
    }

}
