import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Application } from "./Application.js";

@Entity()
export class InviteToken {
    @PrimaryGeneratedColumn()
    serial_id: number

    @Column({ unique: true })
    @Index("IDX_invite_token")
	inviteToken: string

    @ManyToOne(type => Application, { eager: true })
    @JoinColumn()
    application: Application

    @Column({ nullable: true })
    sats: number

    @Column()
    used: boolean

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
