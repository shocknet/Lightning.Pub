import { NostrEvent } from "@shocknet/clink-sdk";
import { User } from "./storage/entity/User";
import { ManagementGrant } from "./storage/entity/ManagementGrant";
import { validateEvent } from "nostr-tools";
import { getRepository } from "typeorm";
import { UserOffer } from "./storage/entity/UserOffer";
import { NostrSend, NostrSettings } from "./nostr/handler";

export class ManagementManager {
    private nostrSend: NostrSend;
    private settings: NostrSettings;

    constructor(nostrSend: NostrSend, settings: NostrSettings) {
        this.nostrSend = nostrSend;
        this.settings = settings;
    }

    /**
     * Handles an incoming CLINK Manage request
     * @param event The raw Nostr event
     */
    public async handleRequest(event: NostrEvent) {
        const app = this.settings.apps.find(a => a.appId === event.appId);
        if (!app) {
            console.error(`App with id ${event.appId} not found in settings`);
            return; // Cannot proceed
        }
        const appPubkey = app.publicKey;

        // Validate event
        const isValid = validateEvent(event);
        if (!isValid) {
            console.error("Invalid event");
            return;
        }

        // Check grant
        const userIdTag = event.tags.find((t: string[]) => t[0] === 'p');
        if (!userIdTag) {
            console.error("No user specified in event");
            return;
        }
        const userId = userIdTag[1];
        const requestingPubkey = event.pubkey;

        const grantRepo = getRepository(ManagementGrant);
        const grant = await grantRepo.findOne({ where: { user_id: userId, app_pubkey: appPubkey } });

        if (!grant) {
            console.error(`No management grant found for app ${appPubkey} and user ${userId}`);
            this.sendErrorResponse(requestingPubkey, `No management grant found for app`, app);
            return;
        }

        if (grant.expires_at && grant.expires_at.getTime() < Date.now()) {
            console.error(`Management grant for app ${appPubkey} and user ${userId} has expired`);
            this.sendErrorResponse(requestingPubkey, `Management grant has expired`, app);
            return;
        }
        
        // Perform action
        const actionTag = event.tags.find((t: string[]) => t[0] === 'a');
        if (!actionTag) {
            console.error("No action specified in event");
            return;
        }

        const action = actionTag[1];
        const offerRepo = getRepository(UserOffer);

        switch (action) {
            case "create":
                const createDetailsTag = event.tags.find((t: string[]) => t[0] === 'd');
                if (!createDetailsTag || !createDetailsTag[1]) {
                    console.error("No details provided for create action");
                    return;
                }
                try {
                    const offerData = JSON.parse(createDetailsTag[1]);
                    const newOffer = offerRepo.create({
                        ...offerData,
                        user_id: userId,
                        managing_app_pubkey: appPubkey
                    });
                    await offerRepo.save(newOffer);
                    this.sendSuccessResponse(requestingPubkey, "Offer created successfully", app);
                } catch (e) {
                    console.error("Failed to parse or save offer data", e);
                    this.sendErrorResponse(requestingPubkey, "Failed to create offer", app);
                }
                break;
            case "update":
                const updateTags = event.tags.filter((t: string[]) => t[0] === 'd');
                if (updateTags.length < 2) {
                    console.error("Insufficient details for update action");
                    return;
                }
                const offerIdToUpdate = updateTags[0][1];
                const updateData = JSON.parse(updateTags[1][1]);

                try {
                    const existingOffer = await offerRepo.findOne({where: { offer_id: offerIdToUpdate }});
                    if (!existingOffer) {
                        console.error(`Offer ${offerIdToUpdate} not found`);
                        return;
                    }

                    if (existingOffer.managing_app_pubkey !== appPubkey) {
                        console.error(`App ${appPubkey} not authorized to update offer ${offerIdToUpdate}`);
                        return;
                    }

                    offerRepo.merge(existingOffer, updateData);
                    await offerRepo.save(existingOffer);
                    this.sendSuccessResponse(requestingPubkey, "Offer updated successfully", app);
                } catch (e) {
                    console.error("Failed to update offer data", e);
                    this.sendErrorResponse(requestingPubkey, "Failed to update offer", app);
                }
                break;
            case "delete":
                const deleteDetailsTag = event.tags.find((t: string[]) => t[0] === 'd');
                if (!deleteDetailsTag || !deleteDetailsTag[1]) {
                    console.error("No details provided for delete action");
                    return;
                }
                const offerIdToDelete = deleteDetailsTag[1];

                try {
                    const offerToDelete = await offerRepo.findOne({where: { offer_id: offerIdToDelete }});
                    if (!offerToDelete) {
                        console.error(`Offer ${offerIdToDelete} not found`);
                        return;
                    }

                    if (offerToDelete.managing_app_pubkey !== appPubkey) {
                        console.error(`App ${appPubkey} not authorized to delete offer ${offerIdToDelete}`);
                        return;
                    }

                    await offerRepo.remove(offerToDelete);
                    this.sendSuccessResponse(requestingPubkey, "Offer deleted successfully", app);
                } catch (e) {
                    console.error("Failed to delete offer", e);
                    this.sendErrorResponse(requestingPubkey, "Failed to delete offer", app);
                }
                break;
            default:
                console.error(`Unknown action: ${action}`);
                this.sendErrorResponse(requestingPubkey, `Unknown action: ${action}`, app);
                return;
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