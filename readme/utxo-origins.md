# Dashboard UTXO sources

`ListUtxos` includes optional `origin` and `is_change` fields. Wallet2 displays
the source, offers a source filter, and totals the visible UTXOs in sats. Older
Pub responses without these fields display as Unknown.

- `USER_DEPOSIT`: an output to a Pub user receiving address or an exact deposit
  outpoint recorded in Pub, including later change descended from those outputs.
- `CHANNEL`: wallet outputs from a channel funding, closing, or sweep transaction,
  including subsequent change. Channel operations start a new channel lineage,
  even if the funding transaction spent user deposit outputs.
- `MIXED`: an ordinary transaction combined user and channel inputs, or spent an
  already mixed output. The whole output is mixed; no amount allocation is guessed.
- `UNKNOWN`: the available history does not establish a source. This includes
  operator deposits and change with missing or unclassified wallet ancestors.

A payment to a registered user receiving address is classified per output, even
when its transaction also has channel-related outputs. An unknown wallet input
keeps otherwise single-source change Unknown. `is_change` reports whether LND
lists the destination as an internal/change address.

## Existing nodes

The first nonempty UTXO list request reconstructs provenance from Pub's receiving
addresses and deposit records plus all LND wallet transactions, open channels,
closed channels (including resolution sweeps), pending channels, and sweep history.
LND transaction inputs link generations of change. Raw transaction hex provides
an input fallback for older history without `previous_outpoints`.

This is a read-only, lazy backfill. No migration, manual first-run command, custom
change address, or changes to LND transaction labels are needed. The result is
cached in memory for 30 seconds and rebuilt on the next request after expiry or
a change in the unspent outpoint set. Concurrent requests for the same snapshot
share the backfill. Restarting Pub rebuilds the cache; no permanent classification
survives a reorg or restored database. Large histories can make the first request
and refreshes slower. If a required history lookup fails, the UTXOs remain visible
as Unknown and Pub logs the error; the next request retries.

These are operational provenance labels. They do not measure liabilities, reserve
funds for an individual user, or constrain LND coin selection. Rebuild Pub and
wallet2 together to expose the new labels in the dashboard. No LND protobuf
regeneration is required: the existing LND client already has the history RPCs.

LND references: [transaction history](https://api.lightning.community/api/lnd/lightning/get-transactions/index.html)
and [sweep history](https://api.lightning.community/api/lnd/wallet-kit/list-sweeps/index.html).
