import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";

@Entity("management_grants")
export class ManagementGrant {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    app_user_id: string

    @Column()
    app_pubkey: string;

    @Column()
    expires_at_unix: number

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}