import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Unique('UQ_sandbox_wallet_user_phone', ['userId', 'phoneNumber'])
@Entity('sandbox_wallets')
export class SandboxWallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  ownerName!: string;

  @Column({ type: 'varchar', nullable: true })
  pinCode!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  initialBalance!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  balance!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
