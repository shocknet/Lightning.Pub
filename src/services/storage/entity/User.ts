import { Entity, PrimaryGeneratedColumn, Column, Index, Check } from "typeorm"

@Entity()
@Check(`"balance_sats" >= 0`)
export class User {

    @PrimaryGeneratedColumn()
    serial_id: number

    @Column()
    @Index({ unique: true })
    user_id: string

    @Column()
    @Index({ unique: true })
    name: string

    @Column()
    secret_sha256: string

    @Column()
    callbackUrl: string

    @Column({ type: 'integer' })
    balance_sats: number

    @Column()
    locked: boolean
}
