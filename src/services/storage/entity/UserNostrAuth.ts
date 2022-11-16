import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserNostrAuth {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User)
    user: User

    @Column()
    @Index({ unique: true })
    nostr_pub: string
}
