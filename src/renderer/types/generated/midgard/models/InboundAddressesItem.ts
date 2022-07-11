// tslint:disable
/**
 * Midgard Public API
 * The Midgard Public API queries THORChain and any chains linked via the Bifröst and prepares information about the network to be readily available for public users. The API parses transaction event data from THORChain and stores them in a time-series database to make time-dependent queries easy. Midgard does not hold critical information. To interact with BEPSwap and Asgardex, users should query THORChain directly.
 *
 * The version of the OpenAPI document: 2.6.9
 * Contact: devs@thorchain.org
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

/**
 * @export
 * @interface InboundAddressesItem
 */
export interface InboundAddressesItem {
    /**
     * @type {string}
     * @memberof InboundAddressesItem
     */
    address: string;
    /**
     * @type {string}
     * @memberof InboundAddressesItem
     */
    chain: string;
    /**
     * @type {string}
     * @memberof InboundAddressesItem
     */
    gas_rate?: string;
    /**
     * indicate whether this chain has halted
     * @type {boolean}
     * @memberof InboundAddressesItem
     */
    halted: boolean;
    /**
     * @type {string}
     * @memberof InboundAddressesItem
     */
    pub_key: string;
    /**
     * @type {string}
     * @memberof InboundAddressesItem
     */
    router?: string;
}
