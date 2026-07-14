# Program keypair

`bracket_bond-keypair.json` is a **fixed program keypair** so a fresh clone
always builds the same program id (`EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U`)
— no `anchor keys sync` needed. The root `postinstall` copies it into
`target/deploy/` so `anchor build` uses it instead of generating a random one.
This removes the `DeclaredProgramIdMismatch` friction testers hit on a fresh clone.

> ⚠️ **Security:** this is a throwaway **devnet/localnet** keypair (the program's
> upgrade authority). Do **not** reuse it for a mainnet deployment — generate a
> fresh keypair and keep it secret before any real launch.
