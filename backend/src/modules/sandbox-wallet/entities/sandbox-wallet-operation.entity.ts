import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type SandboxWalletOperationKind = 'purchase' | 'topup' | 'transfer' | 'refund';

@Entity('sandbox_wallet_operations')
export class SandboxWalletOperation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  walletId!: string;

  @Column()
  userId!: string;

  @Column({ type: 'varchar', nullable: true })
  accountId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  accountTitle!: string | null;

  @Column()
  title!: string;

  @Column()
  category!: string;

  @Column({ type: 'varchar' })
  direction!: 'credit' | 'debit';

  @Column({ type: 'varchar', nullable: true })
  operationKind!: SandboxWalletOperationKind | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'timestamp' })
  occurredAt!: Date;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  balanceAfter!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
