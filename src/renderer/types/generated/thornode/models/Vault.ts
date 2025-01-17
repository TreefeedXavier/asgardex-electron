// tslint:disable
/**
 * Thornode API
 * Thornode REST API.
 *
 * The version of the OpenAPI document: 1.89.0
 * Contact: devs@thorchain.org
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import {
    Coin,
    VaultAddress,
    VaultRouter,
} from './';

/**
 * @export
 * @interface Vault
 */
export interface Vault {
    /**
     * @type {number}
     * @memberof Vault
     */
    block_height?: number;
    /**
     * @type {string}
     * @memberof Vault
     */
    pub_key?: string;
    /**
     * @type {Array<Coin>}
     * @memberof Vault
     */
    coins: Array<Coin>;
    /**
     * @type {string}
     * @memberof Vault
     */
    type?: VaultTypeEnum;
    /**
     * @type {string}
     * @memberof Vault
     */
    status?: string;
    /**
     * @type {number}
     * @memberof Vault
     */
    status_since?: number;
    /**
     * the list of node public keys which are members of the vault
     * @type {Array<string>}
     * @memberof Vault
     */
    membership?: Array<string>;
    /**
     * @type {Array<string>}
     * @memberof Vault
     */
    chains?: Array<string>;
    /**
     * @type {number}
     * @memberof Vault
     */
    inbound_tx_count?: number;
    /**
     * @type {number}
     * @memberof Vault
     */
    outbound_tx_count?: number;
    /**
     * @type {Array<number>}
     * @memberof Vault
     */
    pending_tx_block_heights?: Array<number>;
    /**
     * @type {Array<VaultRouter>}
     * @memberof Vault
     */
    routers: Array<VaultRouter>;
    /**
     * @type {Array<VaultAddress>}
     * @memberof Vault
     */
    addresses: Array<VaultAddress>;
}

/**
 * @export
 * @enum {string}
 */
export enum VaultTypeEnum {
    AsgardVault = 'AsgardVault',
    YggdrasilVault = 'YggdrasilVault'
}

