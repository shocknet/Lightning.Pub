import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne } from "typeorm"
import { User } from "./User"

@Entity()
export class UserReceivingAddress {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User)
    user: User

    @Column()
    @Index({ unique: true })
    address: string

    @Column()
    callbackUrl: string
}
