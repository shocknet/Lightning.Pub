//import whyIsNodeRunning from 'why-is-node-running'
import { globby } from 'globby'
import { setupNetwork } from './networkSetup.js'
import { Describe, SetupTest, teardown, TestBase, StorageTestBase, setupStorageTest, teardownStorageTest } from './testBase.js'
type TestModule = {
    ignore?: boolean
    dev?: boolean
    requires?: 'storage' | '*'
    default: (T: TestBase | StorageTestBase) => Promise<void>
}
let failures = 0
const getDescribe = (fileName: string): Describe => {
    return (message, failure) => {
        if (failure) {
            failures++
            console.error(redConsole, fileName, ": FAILURE ", message, resetConsole)
        } else {
            console.log(greenConsole, fileName, ":", message, resetConsole)
        }
    }
}

const start = async () => {
    const files = await globby(["**/*.spec.js", "!**/node_modules/**"])
    const modules: { file: string, module: TestModule }[] = []
    let devModule = -1
    for (const file of files) {
        const module = await import(`./${file.slice("build/src/tests/".length)}`) as TestModule
        modules.push({ module, file })
        if (module.dev) {
            console.log("dev module found", file)
            if (devModule !== -1) {
                throw new Error("there are multiple dev modules")
            }
            devModule = modules.length - 1
        }
    }
    if (devModule !== -1) {
        console.log("running dev module")
        const { file, module } = modules[devModule]
        if (module.requires === 'storage') {
            console.log("dev module requires only storage, skipping network setup")
        } else {
            await setupNetwork()
        }
        await runTestFile(file, module)
    } else {
        console.log("running all tests")
        await setupNetwork()
        for (const { file, module } of modules) {
            await runTestFile(file, module)
        }
    }
    console.log(failures)
    if (failures) {
        throw new Error("there have been " + failures + " failures in all tests")
    } else {
        console.log(greenConsole, "there have been 0 failures in all tests", resetConsole)
        process.exit(0)
    }


}

const runTestFile = async (fileName: string, mod: TestModule) => {
    console.log(fileName)
    const d = getDescribe(fileName)
    if (mod.ignore) {
        d("-----ignoring this file-----")
        return
    }
    if (mod.dev) {
        d("-----running only this file-----")
    }
    let T: TestBase | StorageTestBase
    if (mod.requires === 'storage') {
        d("-----requires only storage-----")
        T = await setupStorageTest(d)
    } else {
        d("-----requires all-----")
        T = await SetupTest(d)
    }
    try {
        d("test starting")
        await mod.default(T)
    } catch (e: any) {
        d(e, true)
        d("test crashed", true)
    } finally {
        if (mod.requires === 'storage') {
            await teardownStorageTest(T as StorageTestBase)
        } else {
            await teardown(T as TestBase)
        }
    }
    d("test finished")
    if (mod.dev) {
        d("dev mod is not allowed to in CI, failing for precaution", true)
    }
}


const greenConsole = "\x1b[32m"
const redConsole = "\x1b[31m"
const resetConsole = "\x1b[0m"
start()