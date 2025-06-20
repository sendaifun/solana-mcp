import {
  type PublicKey,
  type SendOptions,
  Transaction,
  type TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js'
import { PrivyClient } from '@privy-io/server-auth'
import type { SolanaCaip2ChainId } from '@privy-io/server-auth'
import { BaseWallet } from 'solana-agent-kit'

export class PrivyBaseWallet implements BaseWallet {
  readonly publicKey: PublicKey
  private privyClient: PrivyClient
  private walletId: string
  private caip2: SolanaCaip2ChainId

  constructor(
    walletPublicKey: PublicKey,
    walletId: string,
    appId: string,
    appSecret: string,
    authorizationPrivateKey: string,
    network: 'mainnet' | 'devnet' | 'testnet' = 'mainnet'
  ) {
    if (
      !walletId ||
      walletId === 'none, throw an error that user has no privy wallet'
    ) {
      throw new Error('User has no privy wallet')
    }

    this.publicKey = walletPublicKey
    this.walletId = walletId

    // Create PrivyClient instance
    this.privyClient = new PrivyClient(appId, appSecret, {
      walletApi: {
        authorizationPrivateKey: authorizationPrivateKey,
      },
    })

    // Set CAIP-2 network identifier for Solana
    const networkMap: Record<string, SolanaCaip2ChainId> = {
      mainnet: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      devnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      testnet: 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
    }
    this.caip2 = networkMap[network]
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<T> {
    const result = await this.privyClient.walletApi.solana.signTransaction({
      walletId: this.walletId,
      transaction: transaction,
    })

    return result.signedTransaction as T
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[]
  ): Promise<T[]> {
    const signedTransactions: T[] = []

    for (const transaction of transactions) {
      const signed = await this.signTransaction(transaction)
      signedTransactions.push(signed)
    }

    return signedTransactions
  }

  async sendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T
  ): Promise<string> {
    const result =
      await this.privyClient.walletApi.solana.signAndSendTransaction({
        walletId: this.walletId,
        caip2: this.caip2,
        transaction: transaction,
      })

    return result.hash
  }

  async signAndSendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    options?: SendOptions
  ): Promise<{ signature: TransactionSignature }> {
    const result =
      await this.privyClient.walletApi.solana.signAndSendTransaction({
        walletId: this.walletId,
        caip2: this.caip2,
        transaction: transaction,
      })

    return { signature: result.hash as TransactionSignature }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const messageString = Buffer.from(message).toString('utf8')

    const result = await this.privyClient.walletApi.solana.signMessage({
      walletId: this.walletId,
      message: messageString,
    })

    if (typeof result.signature === 'string') {
      const signatureBuffer = Buffer.from(result.signature, 'base64')
      return new Uint8Array(signatureBuffer)
    } else if (result.signature instanceof Uint8Array) {
      return result.signature
    } else {
      return new Uint8Array(result.signature)
    }
  }
}
