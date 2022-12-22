// tslint:disable
/**
 * Thornode API
 * Thornode REST API.
 *
 * The version of the OpenAPI document: 1.101.0
 * Contact: devs@thorchain.org
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import {
    QuoteFees,
} from './';

/**
 * @export
 * @interface QuoteSaverWithdrawResponse
 */
export interface QuoteSaverWithdrawResponse {
    /**
     * the inbound address for the transaction on the source chain
     * @type {string}
     * @memberof QuoteSaverWithdrawResponse
     */
    inbound_address: string;
    /**
     * generated memo for the withdraw, the client can use this OR send the dust amount
     * @type {string}
     * @memberof QuoteSaverWithdrawResponse
     */
    memo: string;
    /**
     * the dust amount of the target asset the user should send to initialize the withdraw, the client can send this OR provide the memo
     * @type {string}
     * @memberof QuoteSaverWithdrawResponse
     */
    dust_amount: string;
    /**
     * the minimum amount of the target asset the user can expect to withdraw after fees in 1e8 decimals
     * @type {string}
     * @memberof QuoteSaverWithdrawResponse
     */
    expected_amount_out: string;
    /**
     * the number of thorchain blocks the outbound will be delayed
     * @type {number}
     * @memberof QuoteSaverWithdrawResponse
     */
    outbound_delay_blocks: number;
    /**
     * the approximate seconds for the outbound delay before it will be sent
     * @type {number}
     * @memberof QuoteSaverWithdrawResponse
     */
    outbound_delay_seconds: number;
    /**
     * @type {QuoteFees}
     * @memberof QuoteSaverWithdrawResponse
     */
    fees: QuoteFees;
    /**
     * the swap slippage in basis points
     * @type {number}
     * @memberof QuoteSaverWithdrawResponse
     */
    slippage_bps: number;
}