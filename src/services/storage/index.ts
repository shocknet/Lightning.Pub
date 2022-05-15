type Pair = {
    privateKey: Buffer
    publicKey: Buffer
}
const getDeviceKeyPair = async (deviceId: string): Promise<Pair | null> => {
    return null
}
const setDeviceKeyPair = async (deviceId: string, pair: Pair) => { }
export default { getDeviceKeyPair, setDeviceKeyPair }