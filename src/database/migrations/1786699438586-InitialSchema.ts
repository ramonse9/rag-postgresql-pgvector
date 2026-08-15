import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1786699438586 implements MigrationInterface {
    name = 'InitialSchema1786699438586'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`
        );
        await queryRunner.query(
            `CREATE EXTENSION IF NOT EXISTS "vector"`
        );
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "filename" character varying NOT NULL, "originalText" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "document_chunks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "content" text NOT NULL, "chunkIndex" integer NOT NULL, "embedding" vector(1536) NOT NULL, "document_id" uuid, CONSTRAINT "PK_7f9060084e9b872dbb567193978" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "document_chunks" ADD CONSTRAINT "FK_b371ff8bc1e4f65fc3d01420be5" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "document_chunks" DROP CONSTRAINT "FK_b371ff8bc1e4f65fc3d01420be5"`);
        await queryRunner.query(`DROP TABLE "document_chunks"`);
        await queryRunner.query(`DROP TABLE "documents"`);
    }

}
