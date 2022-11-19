import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserNostrAuth {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @Column()
    @Index({ unique: true })
    nostr_pub: string
}
