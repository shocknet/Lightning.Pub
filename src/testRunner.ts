import { globby } from 'globby'
type Describe = (message: string, failure?: boolean) => void

type TestModule = {
    ignore?: boolean
    setup?: () => Promise<void>
    default: (describe: Describe) => Promise<void>
    teardown?: () => Promise<void>
}
let failures = 0
const start = async () => {

    const files = await globby("**/*.spec.js")
    for (const file of files) {
        console.log(file)
        const module = await import(`./${file.slice("build/src/".length)}`) as TestModule
        await runTestFile(file, module)
    }
    if (failures) {
        console.error(redConsole, "there have been", `${failures}`, "failures in all tests", resetConsole)
    } else {
        console.log(greenConsole, "there have been 0 failures in all tests", resetConsole)
    }

}

const runTestFile = async (fileName: string, mod: TestModule) => {
    const d = getDescribe(fileName)
    if (mod.ignore) {
        d("-----ignoring file-----")
        return
    }
    try {
        if (mod.setup) {
            d("setup started")
            await mod.setup()
        }
        d("tests starting")
        await mod.default(d)
        d("tests finished")
        if (mod.teardown) {
            await mod.teardown()
            d("teardown finished")
        }
    } catch (e: any) {
        d("FAILURE", true)
        d(e, true)
    }
}

const getDescribe = (fileName: string): Describe => {
    return (message, failure) => {
        if (failure) {
            failures++
            console.error(redConsole, fileName, ":", message, resetConsole)
        } else {
            console.log(greenConsole, fileName, ":", message, resetConsole)
        }
    }
}
const greenConsole = "\x1b[32m"
const redConsole = "\x1b[31m"
const resetConsole = "\x1b[0m"
start()