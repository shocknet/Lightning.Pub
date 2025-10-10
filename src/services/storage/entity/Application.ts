import { Entity, PrimaryGeneratedColumn, Column, Index, Check, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne } from "typeorm"
import { User } from "./User.js"

@Entity()
export class Application {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    @Index({ unique: true })
    app_id: string

    @Column({ unique: true })
    name: string

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    owner: User

    @Column({ default: false })
    allow_user_creation: boolean

    @Column({ nullable: true, unique: true })
    nostr_private_key?: string

    @Column({ nullable: true, unique: true })
    nostr_public_key?: string

    @Column({ nullable: true })
    avatar_url?: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
