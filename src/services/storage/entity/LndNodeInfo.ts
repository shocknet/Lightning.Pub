import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
export class LndNodeInfo {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    pubkey: string

    @Column({ nullable: true })
    seed?: string

    @Column({ nullable: true })
    backup?: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
