import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type SandboxAccountType = 'main' | 'savings' | 'virtual';

@Entity('sandbox_wallet_accounts')
export class SandboxWalletAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  walletId!: string;

  @Column()
  userId!: string;

  @Column({ type: 'varchar' })
  type!: SandboxAccountType;

  @Column()
  title!: string;

  @Column()
  maskedNumber!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  initialBalance!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  balance!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
