import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserAccess {
    @PrimaryColumn()
    user_id: string

    @Column({ default: 0 })
    last_seen_at_unix: number

    @Column({ default: false })
    locked: boolean
}
