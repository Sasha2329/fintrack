import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense'
}

export enum TransactionSource {
  MANUAL = 'manual',
  WEBHOOK = 'webhook'
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({
    type: 'enum',
    enum: TransactionType
  })
  type!: TransactionType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column()
  category!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({
    type: 'enum',
    enum: TransactionSource,
    default: TransactionSource.MANUAL
  })
  source!: TransactionSource;

  @Column({ type: 'varchar', nullable: true })
  provider!: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalEventId!: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  transactionDate!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;
}
