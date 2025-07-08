import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class ManagementGrant {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    app_user_id: string

    @Column()
    app_pubkey: string;

    @Column()
    expires_at_unix: number

    @Column()
    banned: boolean

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}