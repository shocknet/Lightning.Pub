import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne, JoinColumn } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserReceivingAddress {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User, { eager: true })
    @JoinColumn()
    user: User

    @Column()
    @Index({ unique: true })
    address: string

    @Column()
    callbackUrl: string
}
