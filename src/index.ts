import 'dotenv/config'
import NewServer from '../proto/autogenerated/ts/express_server.js'
import GetServerMethods from './services/serverMethods/index.js'
import serverOptions from './auth.js';
import { LoadNosrtSettingsFromEnv } from './services/nostr/index.js'
import nostrMiddleware from './nostrMiddleware.js'
import { getLogger } from './services/helpers/logger.js';
import { initMainHandler } from './services/main/init.js';
import { LoadMainSettingsFromEnv } from './services/main/settings.js';
import { nip19 } from 'nostr-tools'
//@ts-ignore
const { nprofileEncode } = nip19

const start = async () => {
    const log = getLogger({})
    const mainSettings = LoadMainSettingsFromEnv()
    const keepOn = await initMainHandler(log, mainSettings)
    if (!keepOn) {
        log("manual process ended")
        return
    }

    const { apps, mainHandler, liquidityProviderInfo, wizard, adminManager } = keepOn
    const serverMethods = GetServerMethods(mainHandler)
    const nostrSettings = LoadNosrtSettingsFromEnv()
    log("initializing nostr middleware")
    const { Send, Stop, Ping } = nostrMiddleware(serverMethods, mainHandler,
        { ...nostrSettings, apps, clients: [liquidityProviderInfo] },
        (e, p) => mainHandler.liquidityProvider.onEvent(e, p)
    )
    exitHandler(() => { Stop(); mainHandler.Stop() })
    log("starting server")
    mainHandler.attachNostrSend(Send)
    mainHandler.attachNostrProcessPing(Ping)
    mainHandler.StartBeacons()
    const appNprofile = nprofileEncode({ pubkey: liquidityProviderInfo.publicKey, relays: nostrSettings.relays })
    if (wizard) {
        wizard.AddConnectInfo(appNprofile, nostrSettings.relays)
    }
    adminManager.setAppNprofile(appNprofile)
    const Server = NewServer(serverMethods, serverOptions(mainHandler))
    Server.Listen(mainSettings.servicePort)
}
start()

const exitHandler = async (kill: () => void) => {
    // catch ctrl+c event and exit normally
    process.on('SIGINT', () => {
        console.log('Ctrl-C detected, exiting safely...');
        process.exit(2);
    });

    //catch uncaught exceptions, trace, then exit normally
    process.on('uncaughtException', (e) => {
        console.log('Uncaught Exception detected, exiting safely, and killing all child processes...');
        console.log(e.stack);
        kill();
        process.exit(99);
    });
}