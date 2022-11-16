import { Entity, PrimaryGeneratedColumn, Column, Index, Check, ManyToOne } from "typeorm"
import { User } from "./User.js"

@Entity()
export class UserBasicAuth {

    @PrimaryGeneratedColumn()
    serial_id: number

    @ManyToOne(type => User)
    user: User

    @Column()
    @Index({ unique: true })
    name: string

    @Column()
    secret_sha256: string
}
