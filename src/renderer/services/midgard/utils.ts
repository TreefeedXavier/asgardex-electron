import * as RD from '@devexperts/remote-data-ts'
import { PoolData } from '@thorchain/asgardex-util'
import {
  assetFromString,
  bnOrZero,
  baseAmount,
  Asset,
  assetToString,
  Chain,
  isValidBN,
  bn
} from '@xchainjs/xchain-util'
import BigNumber from 'bignumber.js'
import * as A from 'fp-ts/lib/Array'
import * as FP from 'fp-ts/lib/function'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as O from 'fp-ts/lib/Option'

import { CURRENCY_WHEIGHTS } from '../../const'
import { isBUSDAsset } from '../../helpers/assetHelper'
import { isMiniToken } from '../../helpers/binanceHelper'
import { eqAsset, eqChain } from '../../helpers/fp/eq'
import { optionFromNullableString } from '../../helpers/fp/from'
import { RUNE_POOL_ADDRESS, RUNE_PRICE_POOL } from '../../helpers/poolHelper'
import { PoolDetail } from '../../types/generated/midgard'
import { PricePoolAssets, PricePools, PricePoolAsset, PricePool } from '../../views/pools/Pools.types'
import {
  PoolAssetDetails as PoolAssetsDetail,
  PoolDetails,
  PoolsStateRD,
  SelectedPricePoolAsset,
  PoolAssetDetail,
  PoolShares,
  PoolShare,
  PoolAddress,
  PoolAddresses,
  PoolsDataMap,
  InboundAddress
} from './types'

export const getAssetDetail = (assets: PoolAssetsDetail, ticker: string): O.Option<PoolAssetDetail> =>
  FP.pipe(
    assets,
    A.findFirst(({ asset }: PoolAssetDetail) => asset.ticker === ticker)
  )

export const getPricePools = (pools: PoolDetails, whitelist?: PricePoolAssets): PricePools => {
  const poolDetails = !whitelist
    ? pools
    : pools.filter((detail) => whitelist.find((asset) => detail?.asset === assetToString(asset)))

  const pricePools = poolDetails
    .map((detail: PoolDetail) => {
      // Since we have filtered pools based on whitelist before ^,
      // we can type asset as `PricePoolAsset` now
      const asset = assetFromString(detail?.asset ?? '') as PricePoolAsset
      return {
        asset,
        poolData: toPoolData(detail)
      } as PricePool
    })
    // sort by weights (high weight wins)
    .sort((a, b) => (CURRENCY_WHEIGHTS[assetToString(b.asset)] || 0) - (CURRENCY_WHEIGHTS[assetToString(a.asset)] || 0))
  return [RUNE_PRICE_POOL, ...pricePools]
}

/**
 * Selector to get a `PricePool` from a list of `PricePools` by a given `PricePoolAsset`
 *
 * It will always return a `PricePool`:
 * - (1) `PricePool` from list of pools (if available)
 * - (2) OR BUSDB (if available in list of pools)
 * - (3) OR RUNE (if no other pool is available)
 */
export const pricePoolSelector = (pools: PricePools, oAsset: O.Option<PricePoolAsset>): PricePool =>
  FP.pipe(
    oAsset,
    // (1) Check if `PricePool` is available in `PricePools`
    O.mapNullable((asset) => pools.find((pool) => eqAsset.equals(pool.asset, asset))),
    // (2) If (1) fails, check if BUSDB pool is available in `PricePools`
    O.fold(() => O.fromNullable(pools.find((pool) => isBUSDAsset(pool.asset))), O.some),
    // (3) If (2) failes, return RUNE pool, which is always first entry in pools list
    O.getOrElse(() => NEA.head(pools))
  )

/**
 * Similar to `pricePoolSelector`, but taking `PoolsStateRD` instead of `PoolsState`
 */
export const pricePoolSelectorFromRD = (
  poolsRD: PoolsStateRD,
  selectedPricePoolAsset: SelectedPricePoolAsset
): PricePool =>
  FP.pipe(
    RD.toOption(poolsRD),
    O.chain((pools) => pools.pricePools),
    O.map((pricePools) => pricePoolSelector(pricePools, selectedPricePoolAsset)),
    O.getOrElse(() => RUNE_PRICE_POOL)
  )

/**
 * Gets a `PoolDetail by given Asset
 * It returns `None` if no `PoolDetail` has been found
 */
export const getPoolDetail = (details: PoolDetails, asset: Asset): O.Option<PoolDetail> =>
  FP.pipe(
    details.find((detail: PoolDetail) => {
      const { asset: detailAsset = '' } = detail
      const detailTicker = assetFromString(detailAsset)
      return detailTicker && eqAsset.equals(detailTicker, asset)
    }),
    O.fromNullable
  )

/**
 * Converts `PoolDetails` to `PoolsDataMap`
 * Keys of the end HasMap is PoolDetails[i].asset
 */
export const toPoolsData = (poolDetails: Array<Pick<PoolDetail, 'asset' | 'assetDepth' | 'runeDepth'>>): PoolsDataMap =>
  poolDetails.reduce<PoolsDataMap>((acc, cur) => ({ ...acc, [cur.asset]: toPoolData(cur) }), {})

/**
 * Helper to get PoolData of BUSD pool
 */
export const getBUSDPoolData = (poolDetails: PoolDetails): O.Option<PoolData> =>
  FP.pipe(
    poolDetails,
    A.findFirst(({ asset }) =>
      FP.pipe(
        asset,
        assetFromString,
        O.fromNullable,
        O.fold(() => false, isBUSDAsset)
      )
    ),
    O.map(toPoolData)
  )

/**
 * Transforms `PoolDetail` into `PoolData` (provided by `asgardex-util`)
 */
export const toPoolData = (detail: Pick<PoolDetail, 'assetDepth' | 'runeDepth'>): PoolData => ({
  assetBalance: baseAmount(bnOrZero(detail.assetDepth)),
  runeBalance: baseAmount(bnOrZero(detail.runeDepth))
})

/**
 * Filter out mini tokens from pool assets
 */
export const filterPoolAssets = (poolAssets: string[]) => {
  return poolAssets.filter((poolAsset) => !isMiniToken(assetFromString(poolAsset) || { symbol: '' }))
}

export const getPoolAddressesByChain = (addresses: PoolAddresses, chain: Chain): O.Option<PoolAddress> =>
  FP.pipe(
    addresses,
    A.findFirst((address) => eqChain.equals(address.chain, chain))
  )

export const getGasRateByChain = (
  addresses: Pick<InboundAddress, 'chain' | 'gas_rate'>[],
  chain: Chain
): O.Option<BigNumber> =>
  FP.pipe(
    addresses,
    A.findFirst((address) => eqChain.equals(address.chain, chain)),
    O.chain(({ gas_rate }) =>
      FP.pipe(
        gas_rate,
        O.fromNullable,
        // accept valid numbers only
        O.filterMap((rate) => {
          const rateBN = bn(rate)
          return isValidBN(rateBN) ? O.some(rateBN) : O.none
        })
      )
    )
  )

export const inboundToPoolAddresses = (
  addresses: Pick<InboundAddress, 'chain' | 'address' | 'router' | 'halted'>[]
): PoolAddresses =>
  FP.pipe(
    addresses,
    A.map(({ address, router, chain, halted }) => ({
      chain,
      address,
      router: optionFromNullableString(router),
      halted
    })),
    // Add "empty" rune "pool address" - we never had such pool, but do need it to calculate tx
    A.cons(RUNE_POOL_ADDRESS)
  )

/**
 * Combines 'asym` + `sym` `Poolshare`'s of an `Asset` into a single `Poolshare` for this `Asset`
 *
 * @returns `PoolShares` List of combined `PoolShare` items for each `Asset`
 */
export const combineShares = (shares: PoolShares): PoolShares =>
  FP.pipe(
    shares,
    A.reduce<PoolShare, PoolShares>([], (acc, cur) =>
      FP.pipe(
        acc,
        A.findFirst(({ asset }) => eqAsset.equals(asset, cur.asset)),
        O.fold(
          () => [...acc, { ...cur, type: 'all' }],
          (value) => {
            value.units = cur.units.plus(value.units)
            value.assetAddedAmount = baseAmount(cur.assetAddedAmount.amount().plus(value.assetAddedAmount.amount()))
            value.type = 'all'
            return acc
          }
        )
      )
    )
  )

/**
 * Combines 'asym` + `sym` `Poolshare`'s into a single `Poolshare` by given `Asset` only
 *
 * @returns `O.Option<PoolShare>`  If `Poolshare`'s for given `Asset` exists, it combinens its `PoolShare`. If not, it returns `O.none`
 */
export const combineSharesByAsset = (shares: PoolShares, asset: Asset): O.Option<PoolShare> =>
  FP.pipe(
    shares,
    // filter shares for given asset
    A.filter(({ asset: poolAsset }) => eqAsset.equals(asset, poolAsset)),
    // merge shares
    A.reduce<PoolShare, O.Option<PoolShare>>(O.none, (oAcc, cur) => {
      return FP.pipe(
        oAcc,
        O.map(
          (acc): PoolShare => ({
            ...acc,
            units: cur.units.plus(acc.units),
            assetAddedAmount: baseAmount(cur.assetAddedAmount.amount().plus(acc.assetAddedAmount.amount())),
            type: 'all'
          })
        ),
        O.getOrElse<PoolShare>(() => ({ ...cur, type: 'all' })),
        O.some
      )
    })
  )

/**
 * Filters 'asym` or `sym` `Poolshare`'s by given `Asset`
 */
export const getSharesByAssetAndType = ({
  shares,
  asset,
  type
}: {
  shares: PoolShares
  asset: Asset
  type: 'sym' | 'asym'
}): O.Option<PoolShare> =>
  FP.pipe(
    shares,
    A.filter(({ asset: sharesAsset, type: sharesType }) => eqAsset.equals(asset, sharesAsset) && type === sharesType),
    A.head
  )

export const getPoolAssetDetail = ({
  asset: assetString,
  assetPrice
}: Pick<PoolDetail, 'assetPrice' | 'asset'>): O.Option<PoolAssetDetail> =>
  FP.pipe(
    assetString,
    assetFromString,
    O.fromNullable,
    O.map((asset) => ({
      asset,
      assetPrice: bnOrZero(assetPrice)
    }))
  )

export const getPoolAssetsDetail: (_: Array<Pick<PoolDetail, 'assetPrice' | 'asset'>>) => PoolAssetsDetail = (
  poolDetails
) => FP.pipe(poolDetails, A.filterMap(getPoolAssetDetail))
