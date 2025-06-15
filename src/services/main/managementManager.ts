import { getRepository } from "typeorm";
import { User } from "../storage/entity/User.js";
import { UserOffer } from "../storage/entity/UserOffer.js";
import { ManagementGrant } from "../storage/entity/ManagementGrant.js";
import { NostrEvent, NostrSend, NostrSettings } from "../nostr/handler.js";
import { ManagementStorage } from "../storage/managementStorage.js";

export class ManagementManager {
    private nostrSend: NostrSend;
    private settings: NostrSettings;
    private storage: ManagementStorage;

    constructor(nostrSend: NostrSend, settings: NostrSettings, storage: ManagementStorage) {
        this.nostrSend = nostrSend;
        this.settings = settings;
        this.storage = storage;
    }

    /**
     * Handles an incoming CLINK Manage request
     * @param event The raw Nostr event
     */
    public async handleRequest(event: NostrEvent) {
        const app = this.settings.apps.find((a: any) => a.appId === event.appId);
        if (!app) {
            console.error(`App with id ${event.appId} not found in settings`);
            return; // Cannot proceed
        }

        if (!this._validateRequest(event)) {
            return;
        }

        const grant = await this._checkGrant(event, app.publicKey);
        if (!grant) {
            this.sendErrorResponse(event.pubkey, "Permission denied.", app);
            return;
        }

        await this._performAction(event, app);
    }

    private _validateRequest(event: NostrEvent): boolean {
        // TODO: NIP-44 validation or similar
        return true;
    }

    private async _checkGrant(event: NostrEvent, appPubkey: string): Promise<ManagementGrant | null> {
        const userIdTag = event.tags.find((t: string[]) => t[0] === 'p');
        if (!userIdTag) {
            return null;
        }
        const userId = userIdTag[1];
        
        const grant = await this.storage.getGrant(userId, appPubkey);

        if (!grant || (grant.expires_at && grant.expires_at.getTime() < Date.now())) {
            return null;
        }

        return grant;
    }

    private async _performAction(event: NostrEvent, app: {publicKey: string, appId: string}) {
        const actionTag = event.tags.find((t: string[]) => t[0] === 'a');
        if (!actionTag) {
            console.error("No action specified in event");
            return;
        }

        const action = actionTag[1];

        switch (action) {
            case "create":
                await this._createOffer(event, app);
                break;
            case "update":
                await this._updateOffer(event, app);
                break;
            case "delete":
                await this._deleteOffer(event, app);
                break;
            default:
                console.error(`Unknown action: ${action}`);
                this.sendErrorResponse(event.pubkey, `Unknown action: ${action}`, app);
        }
    }

    private async _createOffer(event: NostrEvent, app: {publicKey: string, appId: string}) {
        const createDetailsTag = event.tags.find((t: string[]) => t[0] === 'd');
        if (!createDetailsTag || !createDetailsTag[1]) {
            console.error("No details provided for create action");
            return;
        }

        const userId = event.tags.find((t: string[]) => t[0] === 'p')![1];

        try {
            const offerData = JSON.parse(createDetailsTag[1]);
            const offerRepo = getRepository(UserOffer);
            const newOffer = offerRepo.create({
                ...offerData,
                user_id: userId,
                managing_app_pubkey: app.publicKey
            });
            await offerRepo.save(newOffer);
            this.sendSuccessResponse(event.pubkey, "Offer created successfully", app);
        } catch (e) {
            console.error("Failed to parse or save offer data", e);
            this.sendErrorResponse(event.pubkey, "Failed to create offer", app);
        }
    }

    private async _updateOffer(event: NostrEvent, app: {publicKey: string, appId: string}) {
        const updateTags = event.tags.filter((t: string[]) => t[0] === 'd');
        if (updateTags.length < 2) {
            console.error("Insufficient details for update action");
            return;
        }
        const offerIdToUpdate = updateTags[0][1];
        const updateData = JSON.parse(updateTags[1][1]);
        const offerRepo = getRepository(UserOffer);

        try {
            const existingOffer = await offerRepo.findOne({where: { offer_id: offerIdToUpdate }});
            if (!existingOffer) {
                console.error(`Offer ${offerIdToUpdate} not found`);
                return;
            }

            if (existingOffer.managing_app_pubkey !== app.publicKey) {
                console.error(`App ${app.publicKey} not authorized to update offer ${offerIdToUpdate}`);
                return;
            }

            offerRepo.merge(existingOffer, updateData);
            await offerRepo.save(existingOffer);
            this.sendSuccessResponse(event.pubkey, "Offer updated successfully", app);
        } catch (e) {
            console.error("Failed to update offer data", e);
            this.sendErrorResponse(event.pubkey, "Failed to update offer", app);
        }
    }

    private async _deleteOffer(event: NostrEvent, app: {publicKey: string, appId: string}) {
        const deleteDetailsTag = event.tags.find((t: string[]) => t[0] === 'd');
        if (!deleteDetailsTag || !deleteDetailsTag[1]) {
            console.error("No details provided for delete action");
            return;
        }
        const offerIdToDelete = deleteDetailsTag[1];
        const offerRepo = getRepository(UserOffer);

        try {
            const offerToDelete = await offerRepo.findOne({where: { offer_id: offerIdToDelete }});
            if (!offerToDelete) {
                console.error(`Offer ${offerIdToDelete} not found`);
                return;
            }

            if (offerToDelete.managing_app_pubkey !== app.publicKey) {
                console.error(`App ${app.publicKey} not authorized to delete offer ${offerIdToDelete}`);
                return;
            }

            await offerRepo.remove(offerToDelete);
            this.sendSuccessResponse(event.pubkey, "Offer deleted successfully", app);
        } catch (e) {
            console.error("Failed to delete offer", e);
            this.sendErrorResponse(event.pubkey, "Failed to delete offer", app);
        }
    }

    private sendSuccessResponse(recipient: string, message: string, app: {publicKey: string, appId: string}) {
        const responseEvent = {
            kind: 21003,
            pubkey: app.publicKey,
            created_at: Math.floor(Date.now() / 1000),
            content: JSON.stringify({ status: "success", message }),
            tags: [['p', recipient]],
        };
        this.nostrSend({ type: 'app', appId: app.appId }, { type: 'event', event: responseEvent, encrypt: { toPub: recipient } });
    }

    private sendErrorResponse(recipient: string, message: string, app: {publicKey: string, appId: string}) {
        const responseEvent = {
            kind: 21003,
            pubkey: app.publicKey,
            created_at: Math.floor(Date.now() / 1000),
            content: JSON.stringify({ status: "error", message }),
            tags: [['p', recipient]],
        };
        this.nostrSend({ type: 'app', appId: app.appId }, { type: 'event', event: responseEvent, encrypt: { toPub: recipient } });
    }
} 