import { useCallback, useMemo } from 'react'

import { Asset, THORChain } from '@xchainjs/xchain-util'
import * as FP from 'fp-ts/function'
import * as O from 'fp-ts/lib/Option'
import { useObservableState } from 'observable-hooks'
import * as Rx from 'rxjs'
import * as RxOp from 'rxjs/operators'

import { isLedgerWallet } from '../../shared/utils/guard'
import { WalletType } from '../../shared/wallet/types'
import { useChainContext } from '../contexts/ChainContext'
import { useWalletContext } from '../contexts/WalletContext'
import { INITIAL_SYM_DEPOSIT_ADDRESSES } from '../services/chain/const'
import { SymDepositAddresses } from '../services/chain/types'
import { ledgerAddressToWalletAddress } from '../services/wallet/util'

/**
 * Hook to handle wallet addresses needed for sym. deposit
 *
 * As always: Use it at `view` level only (not in components)
 */
export const useSymDepositAddresses = (oAsset: O.Option<Asset>) => {
  const { addressByChain$, symDepositAddresses$, setSymDepositAddresses } = useChainContext()

  const symDepositAddresses = useObservableState(symDepositAddresses$, INITIAL_SYM_DEPOSIT_ADDRESSES)

  const { getLedgerAddress$ } = useWalletContext()

  const assetKeystoreAddress$ = useMemo(
    () =>
      FP.pipe(
        oAsset,
        O.fold(
          () => Rx.of(O.none),
          ({ chain }) => addressByChain$(chain)
        )
      ),

    [addressByChain$, oAsset]
  )

  // Track both keystore addresses at once to update global state once at once
  const [{ asset: assetKeystoreAddress, rune: runeKeystoreAddress }]: [SymDepositAddresses, unknown] =
    useObservableState(
      () =>
        FP.pipe(
          Rx.combineLatest([assetKeystoreAddress$, addressByChain$(THORChain)]),
          RxOp.switchMap(([asset, rune]) =>
            Rx.of({
              asset,
              rune
            })
          ),
          // Since we are always "starting" with `keystore` addresses
          // update global state once with it
          RxOp.tap((addresses) => {
            setSymDepositAddresses(addresses)
          })
        ),
      INITIAL_SYM_DEPOSIT_ADDRESSES
    )

  const assetLedgerAddress = useObservableState(
    FP.pipe(
      oAsset,
      O.fold(
        () => Rx.of(O.none),
        ({ chain }) => FP.pipe(getLedgerAddress$(chain), RxOp.map(O.map(ledgerAddressToWalletAddress)))
      )
    ),
    O.none
  )

  const [runeLedgerAddress] = useObservableState(
    () => FP.pipe(getLedgerAddress$(THORChain), RxOp.map(O.map(ledgerAddressToWalletAddress))),
    O.none
  )

  const setAssetWalletType = useCallback(
    (walletType: WalletType) => {
      // Update global state of addresses
      // whenever walletType of ASSET side has been changed
      setSymDepositAddresses({
        ...symDepositAddresses,
        asset: isLedgerWallet(walletType) ? assetLedgerAddress : assetKeystoreAddress
      })
    },
    [assetKeystoreAddress, assetLedgerAddress, setSymDepositAddresses, symDepositAddresses]
  )

  const setRuneWalletType = useCallback(
    (walletType: WalletType) => {
      // Update global state of addresses
      // whenever walletType of RUNE side has been changed
      setSymDepositAddresses({
        ...symDepositAddresses,
        rune: isLedgerWallet(walletType) ? runeLedgerAddress : runeKeystoreAddress
      })
    },
    [runeKeystoreAddress, runeLedgerAddress, setSymDepositAddresses, symDepositAddresses]
  )

  return {
    addresses: symDepositAddresses,
    setAssetWalletType,
    setRuneWalletType
  }
}
