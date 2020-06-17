import { PoolData, assetAmount, assetToBase } from '@thorchain/asgardex-util'

import { PoolDetails } from '../services/midgard/types'
import { PoolDetailStatusEnum, PoolDetail } from '../types/generated/midgard'
import { filterPendingPools, getDeepestPool, getPoolTableRowsData, toPoolData } from './poolHelper'

describe('helpers/poolHelper/', () => {
  const pool1: PoolDetail = { status: PoolDetailStatusEnum.Bootstrapped, runeDepth: '1000' }
  const pool2: PoolDetail = { status: PoolDetailStatusEnum.Enabled, runeDepth: '2000' }
  const pool3: PoolDetail = { status: PoolDetailStatusEnum.Disabled, runeDepth: '0' }
  const pool4: PoolDetail = { status: PoolDetailStatusEnum.Bootstrapped, runeDepth: '4000' }

  describe('filterPendingPools', () => {
    const pool4: PoolDetail = { status: PoolDetailStatusEnum.Bootstrapped }

    it('filters pending pools', () => {
      const pools = [pool1, pool2, pool3, pool4]
      const result = filterPendingPools(pools).length
      expect(result).toEqual(2)
    })

    it('does not filter any pending pools', () => {
      const pools = [pool2, pool3]
      const result = filterPendingPools(pools).length
      expect(result).toEqual(0)
    })
  })

  describe('hasPendingPools', () => {
    it('has pending pools', () => {
      const pools = [pool1, pool2, pool3, pool4]
      const result = filterPendingPools(pools).length
      expect(result).toBeTruthy()
    })

    it('has not pending pools', () => {
      const pools = [pool2, pool3]
      const result = filterPendingPools(pools).length
      expect(result).toBeFalsy()
    })
  })

  describe('getDeepestPool', () => {
    it('returns deepest pool', () => {
      const pools = [pool1, pool2, pool4, pool3]
      const result = getDeepestPool(pools)
      expect(result).toEqual(pool4)
    })

    it('does not return a deepest pool by given an empty list of pools', () => {
      const pools: PoolDetails = []
      const result = getDeepestPool(pools)
      expect(result).toBeNothing()
    })
  })

  describe('getPoolViewData', () => {
    const poolDetails: PoolDetails = [
      {
        asset: 'BNB.TOMOB-1E1',
        status: PoolDetailStatusEnum.Enabled
      },
      {
        asset: 'BNB.LOK-3C0',
        status: PoolDetailStatusEnum.Enabled
      },
      {
        asset: 'BNB.BOLT-E42',
        status: PoolDetailStatusEnum.Bootstrapped
      }
    ]

    const pricePoolData: PoolData = {
      runeBalance: assetToBase(assetAmount(110)),
      assetBalance: assetToBase(assetAmount(100))
    }

    it('returns data for pending pools', () => {
      const result = getPoolTableRowsData(poolDetails, pricePoolData, PoolDetailStatusEnum.Bootstrapped)
      expect(result.length).toEqual(1)
      expect(result[0].pool.target).toEqual('BOLT')
    })

    it('returns data for available pools', () => {
      const result = getPoolTableRowsData(poolDetails, pricePoolData, PoolDetailStatusEnum.Enabled)
      expect(result.length).toEqual(2)
      expect(result[0].pool.target).toEqual('TOMOB')
      expect(result[1].pool.target).toEqual('LOK')
    })
  })

  describe('getPoolViewData', () => {
    const poolDetail: PoolDetail = {
      assetDepth: '11000000000',
      runeDepth: '10000000000'
    }

    it('transforms `PoolData', () => {
      const result = toPoolData(poolDetail)
      expect(result.assetBalance.amount().toNumber()).toEqual(11000000000)
      expect(result.runeBalance.amount().toNumber()).toEqual(10000000000)
    })
  })
})