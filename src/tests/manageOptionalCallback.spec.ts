import assert from "node:assert/strict"
import { DataSource } from "typeorm"
import { generateSecretKey, getPublicKey } from "nostr-tools"
import { ManagementManager } from "../services/CLINK/managementManager.js"
import { NmanageError, validateManageReq } from "../services/CLINK/manageTypes.js"
import { OfferManager } from "../services/CLINK/offerManager.js"
import SettingsManager from "../services/main/settingsManager.js"
import { DEFAULT_OFFER_LABEL } from "../services/helpers/offerValidation.js"
import { MainDbEntities } from "../services/storage/db/db.js"
import { UserOffer } from "../services/storage/entity/UserOffer.js"
import { allMigrations } from "../services/storage/migrations/runner.js"
import { OptionalOfferCallback1794220000000 } from "../services/storage/migrations/1794220000000-optional_offer_callback.js"
import { decodeUserOfferRow, encodeUserOfferRow, mapUserOfferBackupRow } from "../services/backup/segments.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    const app = await T.storage.applicationStorage.AddApplication("optional callbacks", true)
    const keys = await T.storage.applicationStorage.GenerateApplicationKeys(app)
    const pub = getPublicKey(generateSecretKey())
    const user = await T.storage.applicationStorage.AddApplicationUser(app, "optional-callback-seller", 0, pub)
    const settings = new SettingsManager(T.storage)
    await settings.InitSettings()
    settings.OverrideTestSettings(s => { s.nostrRelaySettings.relays = ["wss://relay.example"]; return s })
    const backup = { notifyBackupTable: () => { } }
    const manager = new ManagementManager(T.storage, settings, {} as ManagementManager["notificationsManager"],
        backup as unknown as ConstructorParameters<typeof ManagementManager>[3])
    const handle = async (req: unknown) => manager.HandleClinkManage({ appId: app.app_id, pub, eventId: "callback-test" }, validateManageReq(req))
    const create = (fields: unknown) => handle({ resource: "offer", action: "create", pointer: user.identifier, offer: { fields } })
    const update = (id: string, fields: unknown) => handle({ resource: "offer", action: "update", offer: { id, fields } })
    const invalid = (promise: Promise<unknown>, code: number) => assert.rejects(promise, err => {
        assert.ok(err instanceof NmanageError)
        assert.equal(err.getPayload().code, code)
        return true
    })
    const fields = { label: "Product", price_sats: 1000, payer_data: [] }
    const created = await create(fields)
    assert.ok(created?.details && !Array.isArray(created.details))
    const id = created.details.id
    T.expect(created.details.callback_url).to.equal(null)
    T.expect((await T.storage.offerStorage.GetOffer(id))?.callback_url).to.equal(null)
    T.expect((await T.storage.offerStorage.GetOffer(id))?.label).to.equal("Product")

    const url = "https://example.com/fulfill"
    await update(id, { ...fields, callback_url: url })
    await update(id, { ...fields, label: "Renamed" })
    T.expect((await T.storage.offerStorage.GetOffer(id))?.callback_url).to.equal(url)
    for (const clear of [null, ""]) {
        await update(id, { ...fields, callback_url: clear })
        T.expect((await T.storage.offerStorage.GetOffer(id))?.callback_url).to.equal(null)
        await update(id, { ...fields, callback_url: url })
    }
    await update(id, { ...fields, callback_url: null })
    T.d("Manage create stores NULL; update omission preserves callbacks and explicit null/empty values clear them")

    const defaultOffer = await T.storage.offerStorage.AddDefaultUserOffer(user.identifier)
    const defaultFields = { label: DEFAULT_OFFER_LABEL, price_sats: 0, payer_data: [] }
    await update(defaultOffer.offer_id, { ...defaultFields, callback_url: url })
    await update(defaultOffer.offer_id, defaultFields)
    T.expect((await T.storage.offerStorage.GetOffer(defaultOffer.offer_id))?.callback_url).to.equal(url)
    await update(defaultOffer.offer_id, { ...defaultFields, callback_url: null })
    T.expect((await T.storage.offerStorage.GetOffer(defaultOffer.offer_id))?.callback_url).to.equal(null)

    for (const field of ["label", "price_sats", "payer_data"]) {
        const partial: Record<string, unknown> = { ...fields }
        delete partial[field]
        await invalid(create(partial), 6)
        await invalid(update(id, partial), 6)
    }
    await invalid(create({ ...fields, label: "" }), 5)
    await invalid(update(id, { ...fields, label: "" }), 5)
    await invalid(handle({ resource: "offer", action: "update", pointer: user.identifier, offer: { fields } }), 6)
    for (const callback_url of [0, false, {}, []]) {
        await invalid(create({ ...fields, callback_url }), 6)
        await invalid(update(id, { ...fields, callback_url }), 6)
    }
    T.expect((await T.storage.offerStorage.GetOffer(id))?.label).to.equal("Product")
    T.d("Missing/empty labels are rejected rather than invented; update still requires offer.id")

    let invoiceCallback: string | undefined
    const offers = Object.assign(Object.create(OfferManager.prototype), {
        storage: T.storage, settings,
        applicationManager: {
            GetApp: async () => ({ npub: keys.publicKey }),
            AddAppUserInvoice: async (_appId: string, req: { http_callback_url: string }) => {
                invoiceCallback = req.http_callback_url
                return { invoice: "test-invoice" }
            },
        },
    }) as OfferManager
    const config = await offers.GetUserOffer({ app_id: app.app_id, app_user_id: user.identifier, user_id: user.user.user_id }, { offer_id: id })
    T.expect(config.callback_url).to.equal("")
    await offers.HandleUserOffer({ offer: id }, app.app_id, 10000)
    T.expect(invoiceCallback).to.equal("")
    const stored = await T.storage.offerStorage.GetOffer(id)
    assert.ok(stored)
    const row = mapUserOfferBackupRow(stored)
    const encoded = encodeUserOfferRow(row)
    T.expect(decodeUserOfferRow(encoded).callback_url).to.equal(null)
    assert.deepEqual(encoded, encodeUserOfferRow({ ...row, callback_url: "" }))
    T.expect(decodeUserOfferRow(encodeUserOfferRow({ ...row, callback_url: url })).callback_url).to.equal(url)
    const restoredId = `restored-${id}`
    T.expect(await T.storage.StartTransaction(tx => T.storage.offerStorage.RestoreUserOffers([{ ...decodeUserOfferRow(encoded), offer_id: restoredId }], tx))).to.equal(1)
    T.expect((await T.storage.offerStorage.GetOffer(restoredId))?.callback_url).to.equal(null)
    T.d("NULL callbacks work for invoices and backups without changing the native RPC string contract or backup bytes")

    await testMigration(T)
}

const testMigration = async (T: StorageTestBase) => {
    const source = await new DataSource({
        type: "better-sqlite3", database: ":memory:", entities: Object.values(MainDbEntities),
        migrations: allMigrations.filter(migration => migration !== OptionalOfferCallback1794220000000),
    }).initialize()
    const runner = source.createQueryRunner()
    try {
        await source.runMigrations()
        const repository = source.getRepository(UserOffer)
        await repository.save([
            { app_user_id: "seller", offer_id: "legacy-empty", label: "Empty", callback_url: "", blind: true, payer_data: ["email"] },
            { app_user_id: "seller", offer_id: "legacy-url", label: "URL", callback_url: "https://example.com/fulfill", bearer_token: "token" },
        ])
        const before = await repository.find({ order: { offer_id: "ASC" } })
        const migration = new OptionalOfferCallback1794220000000()
        await migration.up(runner)
        T.expect((await runner.getTable("user_offer"))?.findColumnByName("callback_url")?.isNullable).to.equal(true)
        const upgraded = await repository.find({ order: { offer_id: "ASC" } })
        T.expect(upgraded).to.deep.equal(before.map(offer => ({ ...offer, callback_url: offer.callback_url || null })))
        await assert.rejects(repository.insert({ app_user_id: "seller", offer_id: "legacy-empty", label: "Duplicate", callback_url: null }), /UNIQUE/)
        await migration.down(runner)
        T.expect((await runner.getTable("user_offer"))?.findColumnByName("callback_url")?.isNullable).to.equal(false)
        T.expect(await repository.find({ order: { offer_id: "ASC" } })).to.deep.equal(before)
        T.d("Callback migration and rollback preserve offer data and uniqueness while converting empty strings and NULL")
    } finally {
        await runner.release()
        await source.destroy()
    }
}
