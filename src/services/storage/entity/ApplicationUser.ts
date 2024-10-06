import { Entity, PrimaryGeneratedColumn, Column, Index, JoinColumn, OneToOne, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"
import { Application } from "./Application.js"

@Entity()
export class ApplicationUser {

    @PrimaryGeneratedColumn()
    serial_id: number

    @OneToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @ManyToOne(type => Application, { eager: true })
    @JoinColumn()
    application: Application

    @Column()
    @Index({ unique: true })
    identifier: string

    @Column({ nullable: true, unique: true })
    nostr_public_key?: string

    @Column({ default: "" })
    callback_url: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
