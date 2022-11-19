const failure = true
export default async (describe: (message: string, failure?: boolean) => void) => {
    describe("all good")
    describe("oh no", failure)
}