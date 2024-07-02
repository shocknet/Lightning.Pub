import { Entity, PrimaryGeneratedColumn, Column, Index, JoinColumn, OneToOne, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserBasicAuth {

    @PrimaryGeneratedColumn()
    serial_id: number

    @OneToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @Column()
    @Index({ unique: true })
    name: string

    @Column()
    secret_sha256: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date
}
