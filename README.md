# Asterism

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

Check [DOCS.md](./DOCS.md) or visit [Asterizm Docs](https://docs.asterizm.io/)

### Build

`npx blueprint build` or `yarn blueprint build` or `yarn build:all`

### Test

`npx blueprint test` or `yarn blueprint test` or `yarn test:all`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
